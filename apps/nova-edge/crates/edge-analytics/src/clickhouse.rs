//! ClickHouse client + schema initialization.
//!
//! Provides a buffered/mock analytics client that accumulates request log
//! rows in memory. In production, this would flush to a real ClickHouse
//! instance.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info};

/// A single request log row matching the ClickHouse `request_log` table.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RequestLogRow {
    pub timestamp: DateTime<Utc>,
    pub host: String,
    pub path: String,
    pub method: String,
    pub status: u16,
    pub latency_ms: u64,
    pub proxy_name: String,
    pub client_ip: String,
}

/// ClickHouse table schema for `request_log`.
pub const REQUEST_LOG_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS request_log (
    timestamp DateTime64(3),
    host String,
    path String,
    method String,
    status UInt16,
    latency_ms UInt64,
    proxy_name String,
    client_ip String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (host, timestamp)
TTL timestamp + INTERVAL 90 DAY
"#;

/// Analytics client that buffers rows in memory (mock/buffered mode).
/// Can be swapped for a real ClickHouse client in production.
#[derive(Debug)]
pub struct AnalyticsClient {
    /// Buffered rows awaiting flush.
    rows: RwLock<Vec<RequestLogRow>>,
    /// Maximum buffer size before auto-flush.
    buffer_size: usize,
}

impl Default for AnalyticsClient {
    fn default() -> Self {
        Self::new(1000)
    }
}

impl AnalyticsClient {
    /// Create a new buffered client with the given max buffer size.
    pub fn new(buffer_size: usize) -> Self {
        Self {
            rows: RwLock::new(Vec::new()),
            buffer_size,
        }
    }

    /// Create a shared (Arc-wrapped) client.
    pub fn shared(buffer_size: usize) -> Arc<Self> {
        Arc::new(Self::new(buffer_size))
    }

    /// Insert a request log row into the buffer.
    pub async fn insert_request_log(&self, row: RequestLogRow) {
        let mut rows = self.rows.write().await;
        debug!(
            host = %row.host,
            path = %row.path,
            status = row.status,
            latency_ms = row.latency_ms,
            "Buffered request log row"
        );
        rows.push(row);

        // Auto-flush if buffer is full
        if rows.len() >= self.buffer_size {
            self.flush_internal(&mut rows).await;
        }
    }

    /// Insert multiple rows at once.
    pub async fn insert_batch(&self, batch: Vec<RequestLogRow>) {
        let mut rows = self.rows.write().await;
        rows.extend(batch);

        if rows.len() >= self.buffer_size {
            self.flush_internal(&mut rows).await;
        }
    }

    /// Flush all buffered rows. In production, this would write to ClickHouse.
    pub async fn flush(&self) {
        let mut rows = self.rows.write().await;
        self.flush_internal(&mut rows).await;
    }

    async fn flush_internal(&self, rows: &mut Vec<RequestLogRow>) {
        if rows.is_empty() {
            return;
        }
        let count = rows.len();
        info!(count = count, "Flushing request log rows to ClickHouse (mock)");
        // In production: write to ClickHouse using `clickhouse::Client::insert()`
        rows.clear();
    }

    /// Get the current number of buffered rows (for testing/monitoring).
    pub async fn buffered_count(&self) -> usize {
        self.rows.read().await.len()
    }

    /// Get all buffered rows (for testing).
    pub async fn get_buffered_rows(&self) -> Vec<RequestLogRow> {
        self.rows.read().await.clone()
    }

    /// Validate that a row matches the expected schema constraints.
    pub fn validate_row(row: &RequestLogRow) -> Result<(), String> {
        if row.host.is_empty() {
            return Err("host cannot be empty".into());
        }
        if row.path.is_empty() {
            return Err("path cannot be empty".into());
        }
        if row.method.is_empty() {
            return Err("method cannot be empty".into());
        }
        // Status must be a valid HTTP status code
        if row.status < 100 || row.status > 599 {
            return Err(format!("invalid HTTP status: {}", row.status));
        }
        Ok(())
    }

    /// Count rows matching a filter predicate.
    pub async fn count_where<F>(&self, predicate: F) -> usize
    where
        F: Fn(&RequestLogRow) -> bool,
    {
        let rows = self.rows.read().await;
        rows.iter().filter(|r| predicate(r)).count()
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_row(host: &str, path: &str, status: u16) -> RequestLogRow {
        RequestLogRow {
            timestamp: Utc::now(),
            host: host.into(),
            path: path.into(),
            method: "GET".into(),
            status,
            latency_ms: 42,
            proxy_name: "test-proxy".into(),
            client_ip: "127.0.0.1".into(),
        }
    }

    #[tokio::test]
    async fn insert_and_count() {
        let client = AnalyticsClient::new(100);
        client.insert_request_log(make_row("a.com", "/", 200)).await;
        client.insert_request_log(make_row("b.com", "/api", 404)).await;

        assert_eq!(client.buffered_count().await, 2);

        let count = client.count_where(|r| r.status == 200).await;
        assert_eq!(count, 1);

        let count = client.count_where(|r| r.host == "b.com").await;
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn insert_batch() {
        let client = AnalyticsClient::new(100);
        let batch = vec![
            make_row("a.com", "/", 200),
            make_row("b.com", "/api", 201),
            make_row("c.com", "/health", 200),
        ];
        client.insert_batch(batch).await;

        assert_eq!(client.buffered_count().await, 3);
    }

    #[tokio::test]
    async fn flush_clears_buffer() {
        let client = AnalyticsClient::new(100);
        client.insert_request_log(make_row("a.com", "/", 200)).await;
        assert_eq!(client.buffered_count().await, 1);

        client.flush().await;
        assert_eq!(client.buffered_count().await, 0);
    }

    #[tokio::test]
    async fn auto_flush_on_buffer_full() {
        let client = AnalyticsClient::new(2); // very small buffer
        client.insert_request_log(make_row("a.com", "/", 200)).await;
        client.insert_request_log(make_row("b.com", "/", 200)).await;
        // Buffer full → auto-flush
        assert_eq!(client.buffered_count().await, 0);
    }

    #[tokio::test]
    async fn get_buffered_rows() {
        let client = AnalyticsClient::new(100);
        let row = make_row("test.com", "/path", 200);
        client.insert_request_log(row.clone()).await;

        let rows = client.get_buffered_rows().await;
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].host, "test.com");
        assert_eq!(rows[0].path, "/path");
    }

    #[test]
    fn schema_validation_valid_row() {
        let row = make_row("test.com", "/", 200);
        assert!(AnalyticsClient::validate_row(&row).is_ok());
    }

    #[test]
    fn schema_validation_empty_host() {
        let mut row = make_row("", "/", 200);
        assert!(AnalyticsClient::validate_row(&row).is_err());
    }

    #[test]
    fn schema_validation_empty_path() {
        let mut row = make_row("test.com", "", 200);
        assert!(AnalyticsClient::validate_row(&row).is_err());
    }

    #[test]
    fn schema_validation_invalid_status() {
        let mut row = make_row("test.com", "/", 999);
        let result = AnalyticsClient::validate_row(&row);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("invalid HTTP status"));
    }

    #[test]
    fn schema_validation_zero_status() {
        let row = make_row("test.com", "/", 0);
        assert!(AnalyticsClient::validate_row(&row).is_err());
    }

    #[test]
    fn request_log_row_serde_roundtrip() {
        let row = make_row("test.example.com", "/api/data", 201);
        let json = serde_json::to_string(&row).unwrap();
        let back: RequestLogRow = serde_json::from_str(&json).unwrap();
        assert_eq!(row, back);
    }

    #[tokio::test]
    async fn shared_client() {
        let client = AnalyticsClient::shared(100);
        client.insert_request_log(make_row("a.com", "/", 200)).await;
        assert_eq!(client.buffered_count().await, 1);
    }

    #[tokio::test]
    async fn count_where_empty() {
        let client = AnalyticsClient::new(100);
        let count = client.count_where(|_| true).await;
        assert_eq!(count, 0);
    }

    #[test]
    fn schema_string_contains_table_definition() {
        assert!(REQUEST_LOG_SCHEMA.contains("request_log"));
        assert!(REQUEST_LOG_SCHEMA.contains("timestamp"));
        assert!(REQUEST_LOG_SCHEMA.contains("host"));
        assert!(REQUEST_LOG_SCHEMA.contains("latency_ms"));
        assert!(REQUEST_LOG_SCHEMA.contains("proxy_name"));
        assert!(REQUEST_LOG_SCHEMA.contains("client_ip"));
    }
}
