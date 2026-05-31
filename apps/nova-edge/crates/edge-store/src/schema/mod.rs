//! Schema loading, validation, and application.
//!
//! This module provides [`SchemaManager`], which is responsible for:
//!
//! 1. Loading schema DDL from embedded `.surql` files (via `include_str!`)
//! 2. Detecting whether the database schema is already initialized
//! 3. Applying DDL statements when the schema is new or has changed
//! 4. Computing a checksum of the schema for change detection
//!
//! # Studio Preset
//!
//! The default schema is embedded from [`studio.surql`] and matches the
//! hardcoded DDL previously defined in `surreal_store::SCHEMA_DDL`.
//!
//! # Change Detection
//!
//! The schema file's SHA-256 hash is stored in a SurrealDB record
//! (`_schema_meta:studio`). On startup, the stored hash is compared
//! with the current file's hash. If they differ, all DDL is re-applied.

use anyhow::Result;
use surrealdb::Connection;
use surrealdb::Surreal;

/// The raw studio schema DDL, embedded at compile time.
pub const STUDIO_SCHEMA_SURQL: &str = include_str!("studio.surql");

/// The record ID used to persist schema metadata in SurrealDB.
const SCHEMA_META_ID: &str = "_schema_meta:studio";

// ── Free functions (no DB required) ──────────────────────────────────

/// Compute a SHA-256 checksum of a schema string.
///
/// Returns a hex-encoded 64-character string that uniquely identifies
/// the schema version.
pub fn schema_checksum(schema_sql: &str) -> String {
    let digest = sha256_hash(schema_sql.as_bytes());
    bytes_to_hex(&digest)
}

/// Parse a schema string into individual DDL statements.
///
/// Splits on newlines, strips comments (lines starting with `--`)
/// and blank lines, returning each non-empty statement.
pub fn parse_statements(schema_sql: &str) -> Vec<&str> {
    schema_sql
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty() && !line.starts_with("--"))
        .collect()
}

/// Convenience: checksum the embedded studio schema.
pub fn studio_schema_checksum() -> String {
    schema_checksum(STUDIO_SCHEMA_SURQL)
}

/// Convenience: parse the embedded studio schema into statements.
pub fn studio_parse_statements() -> Vec<&'static str> {
    parse_statements(STUDIO_SCHEMA_SURQL)
}

// ── SchemaManager ─────────────────────────────────────────────────────

/// Manages schema loading, checksumming, and application.
///
/// Generic over any SurrealDB [`Connection`] type, matching the same
/// pattern as `SurrealStore`.
pub struct SchemaManager<C: Connection> {
    db: Surreal<C>,
    schema_sql: &'static str,
}

impl<C: Connection + Send + Sync> SchemaManager<C> {
    /// Create a new `SchemaManager` with the default studio schema.
    pub fn new(db: Surreal<C>) -> Self {
        Self {
            db,
            schema_sql: STUDIO_SCHEMA_SURQL,
        }
    }

    /// Create a `SchemaManager` with a custom schema source.
    ///
    /// Useful for testing or for alternative domain presets.
    pub fn with_schema(db: Surreal<C>, schema_sql: &'static str) -> Self {
        Self { db, schema_sql }
    }

    /// Compute the SHA-256 checksum of the managed schema.
    pub fn checksum(&self) -> String {
        schema_checksum(self.schema_sql)
    }

    /// Parse the managed schema into individual DDL statements.
    pub fn statements(&self) -> Vec<&str> {
        parse_statements(self.schema_sql)
    }

    /// Check if the schema has already been applied to this database.
    ///
    /// Queries the `_schema_meta:studio` record and compares its stored
    /// checksum against the current schema file's checksum.
    pub async fn is_initialized(&self) -> Result<bool> {
        let stored = self.fetch_stored_checksum().await?;
        Ok(stored.is_some_and(|stored| stored == self.checksum()))
    }

    /// Apply all DDL statements to the database.
    ///
    /// This runs each statement sequentially. After success, the
    /// current schema checksum is persisted to the database so that
    /// subsequent startups can skip re-application.
    pub async fn apply_schema(&self) -> Result<()> {
        let statements = self.statements();
        tracing::info!(
            statement_count = statements.len(),
            checksum = %self.checksum(),
            "Applying schema DDL statements"
        );

        for (i, stmt) in statements.iter().enumerate() {
            tracing::debug!(index = i, statement = %stmt, "Executing DDL");
            self.db.query(*stmt).await?;
        }

        self.persist_checksum().await?;
        tracing::info!("Schema applied successfully");
        Ok(())
    }

    /// Ensure the schema is applied: check if initialized, and if not
    /// (or if the checksum has changed), apply all DDL.
    ///
    /// This is the main entry point called during application startup.
    pub async fn ensure_schema(&self) -> Result<()> {
        if self.is_initialized().await? {
            tracing::debug!("Schema already up-to-date, skipping");
            return Ok(());
        }
        self.apply_schema().await
    }

    // ── Private helpers ────────────────────────────────────────────────

    /// Fetch the previously stored checksum from the database, if any.
    async fn fetch_stored_checksum(&self) -> Result<Option<String>> {
        let mut response = self
            .db
            .query("SELECT checksum FROM type::record($id)")
            .bind(serde_json::json!({ "id": SCHEMA_META_ID }))
            .await?;

        let raw: Vec<serde_json::Value> = response.take(0)?;
        Ok(raw
            .into_iter()
            .next()
            .and_then(|v| v.get("checksum").and_then(|c| c.as_str()).map(String::from)))
    }

    /// Persist the current schema checksum to the database.
    async fn persist_checksum(&self) -> Result<()> {
        let checksum = self.checksum();
        self.db
            .query(
                "UPDATE type::record($id) CONTENT { checksum: $checksum, updatedAt: time::now() }",
            )
            .bind(serde_json::json!({
                "id": SCHEMA_META_ID,
                "checksum": checksum,
            }))
            .await?;
        Ok(())
    }
}

// ── SHA-256 hash ──────────────────────────────────────────────────────

/// A minimal, dependency-free SHA-256 implementation for schema checksums.
///
/// This avoids pulling in additional crates just for hashing. The
/// implementation follows FIPS 180-4 exactly.
fn sha256_hash(data: &[u8]) -> [u8; 32] {
    // Pre-processing: adding padding bits
    let bit_len = (data.len() as u64) * 8;
    let mut padded = data.to_vec();
    padded.push(0x80);
    while padded.len() % 64 != 56 {
        padded.push(0x00);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());

    // Initialize hash values (first 32 bits of the fractional parts of the square roots of the first 8 primes)
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    // Round constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes)
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
        0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
        0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
        0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
        0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    // Process each 512-bit (64-byte) block
    for chunk in padded.chunks(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([
                chunk[i * 4],
                chunk[i * 4 + 1],
                chunk[i * 4 + 2],
                chunk[i * 4 + 3],
            ]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16].wrapping_add(s0).wrapping_add(w[i - 7]).wrapping_add(s1);
        }

        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh] = h;

        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let temp1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);

            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }

    let mut result = [0u8; 32];
    for (i, val) in h.iter().enumerate() {
        result[i * 4..i * 4 + 4].copy_from_slice(&val.to_be_bytes());
    }
    result
}

/// Convert a byte array to lowercase hex string.
fn bytes_to_hex(bytes: &[u8]) -> String {
    use std::fmt::Write;
    let mut hex = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        write!(&mut hex, "{b:02x}").unwrap();
    }
    hex
}

// ── Backward-compatible convenience function ──────────────────────────

/// Run all schema DDL statements against the database.
///
/// This is a convenience wrapper kept for backward compatibility with
/// the original `schema.rs` module. Prefer using [`SchemaManager`] for
/// new code — it provides checksum-based change detection and avoids
/// re-applying an up-to-date schema on every startup.
pub async fn ensure_schema(db: &Surreal<surrealdb::engine::remote::ws::Client>) -> Result<()> {
    for ddl in super::surreal_store::SCHEMA_DDL {
        db.query(*ddl).await?;
    }
    Ok(())
}

// ── Tests ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Schema checksum ───────────────────────────────────────────────

    #[test]
    fn studio_checksum_is_64_hex_chars() {
        let checksum = studio_schema_checksum();
        assert_eq!(checksum.len(), 64, "SHA-256 hex should be 64 chars");
        assert!(checksum.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn checksum_deterministic() {
        let a = schema_checksum(STUDIO_SCHEMA_SURQL);
        let b = schema_checksum(STUDIO_SCHEMA_SURQL);
        assert_eq!(a, b);
    }

    #[test]
    fn checksum_changes_with_content() {
        let a = schema_checksum("DEFINE TABLE x SCHEMALESS");
        let b = schema_checksum("DEFINE TABLE y SCHEMALESS");
        assert_ne!(a, b);
    }

    // ── Parse statements ──────────────────────────────────────────────

    #[test]
    fn studio_schema_has_25_statements() {
        let stmts = studio_parse_statements();
        assert_eq!(
            stmts.len(),
            25,
            "Studio schema should have exactly 25 DDL statements, got {}: {stmts:?}",
            stmts.len()
        );
    }

    #[test]
    fn studio_schema_contains_expected_tables() {
        let stmts = studio_parse_statements();
        let sql = stmts.join(" ");
        assert!(
            sql.contains("DEFINE TABLE IF NOT EXISTS workspace_proxy SCHEMALESS"),
            "Missing workspace_proxy table definition"
        );
        assert!(
            sql.contains("DEFINE TABLE IF NOT EXISTS proxy_domain SCHEMALESS"),
            "Missing proxy_domain table definition"
        );
    }

    #[test]
    fn parse_skips_comments_and_blanks() {
        let schema: &str = "-- comment\n\nDEFINE TABLE x SCHEMALESS\n\n-- another comment\nDEFINE FIELD y ON x TYPE string\n";
        let stmts = parse_statements(schema);
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "DEFINE TABLE x SCHEMALESS");
        assert_eq!(stmts[1], "DEFINE FIELD y ON x TYPE string");
    }

    #[test]
    fn studio_schema_has_workspace_proxy_fields() {
        let stmts = studio_parse_statements();
        let sql = stmts.join(" ");
        // Check key fields from workspace_proxy
        assert!(sql.contains("DEFINE FIELD IF NOT EXISTS userId ON workspace_proxy TYPE string"));
        assert!(sql.contains("DEFINE FIELD IF NOT EXISTS proxyName ON workspace_proxy TYPE string"));
        assert!(sql.contains("DEFINE FIELD IF NOT EXISTS localPort ON workspace_proxy TYPE number"));
        assert!(sql.contains("DEFINE FIELD IF NOT EXISTS enabled ON workspace_proxy TYPE bool"));
    }

    #[test]
    fn studio_schema_has_proxy_domain_fields() {
        let stmts = studio_parse_statements();
        let sql = stmts.join(" ");
        assert!(sql.contains("DEFINE FIELD IF NOT EXISTS host ON proxy_domain TYPE string"));
        assert!(sql.contains("DEFINE FIELD IF NOT EXISTS proxyId ON proxy_domain TYPE string"));
        assert!(sql.contains("DEFINE FIELD IF NOT EXISTS kind ON proxy_domain TYPE string"));
        assert!(sql.contains("DEFINE FIELD IF NOT EXISTS status ON proxy_domain TYPE string"));
    }

    #[test]
    fn studio_schema_has_indexes() {
        let stmts = studio_parse_statements();
        let sql = stmts.join(" ");
        assert!(sql.contains("DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_studio"));
        assert!(sql.contains("DEFINE INDEX IF NOT EXISTS idx_workspace_proxy_name"));
        assert!(sql.contains("DEFINE INDEX IF NOT EXISTS idx_proxy_domain_host"));
        assert!(sql.contains("DEFINE INDEX IF NOT EXISTS idx_proxy_domain_proxy"));
    }

    // ── SHA-256 hash correctness ──────────────────────────────────────

    #[test]
    fn sha256_empty_string() {
        let hash = sha256_hash(b"");
        let hex = bytes_to_hex(&hash);
        assert_eq!(
            hex,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn sha256_abc() {
        let hash = sha256_hash(b"abc");
        let hex = bytes_to_hex(&hash);
        assert_eq!(
            hex,
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn sha256_longer_input() {
        // SHA-256 of "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"
        let input = b"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq";
        let hash = sha256_hash(input);
        let hex = bytes_to_hex(&hash);
        assert_eq!(
            hex,
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
        );
    }

    // ── SchemaManager compile-time check ──────────────────────────────

    /// Verify that SchemaManager is generic over Connection, similar to
    /// how SurrealStore is parameterized.
    #[test]
    fn schema_manager_is_generic_over_connection() {
        fn _check(_: SchemaManager<surrealdb::engine::remote::http::Client>) {}
    }
}
