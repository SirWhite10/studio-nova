# ── Stage 1: Build ────────────────────────────────────────────────────
FROM rust:1.85-slim AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Cache deps by copying manifests first
COPY Cargo.toml ./
COPY Cargo.lock* ./
COPY crates/nova-edge/Cargo.toml crates/nova-edge/Cargo.toml
COPY crates/edge-api/Cargo.toml crates/edge-api/Cargo.toml
COPY crates/edge-tls/Cargo.toml crates/edge-tls/Cargo.toml
COPY crates/edge-proxy/Cargo.toml crates/edge-proxy/Cargo.toml
COPY crates/edge-tunnel/Cargo.toml crates/edge-tunnel/Cargo.toml
COPY crates/edge-store/Cargo.toml crates/edge-store/Cargo.toml
COPY crates/edge-analytics/Cargo.toml crates/edge-analytics/Cargo.toml
COPY crates/edge-dns/Cargo.toml crates/edge-dns/Cargo.toml
COPY crates/edge-config/Cargo.toml crates/edge-config/Cargo.toml

# Create stub lib.rs / main.rs so cargo can resolve the workspace
RUN mkdir -p crates/nova-edge/src && echo 'fn main() {}' > crates/nova-edge/src/main.rs \
    && for crate in edge-api edge-tls edge-proxy edge-tunnel edge-store edge-analytics edge-dns edge-config; do \
        mkdir -p "crates/$crate/src" && touch "crates/$crate/src/lib.rs"; \
    done

# Build dependencies only (layer cache)
RUN cargo build --release 2>/dev/null || true

# Now copy the actual source code
COPY crates/ crates/

# Build the real binary
RUN cargo build --release

# ── Stage 2: Runtime ─────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1000 nova \
    && useradd --uid 1000 --gid nova --shell /bin/bash --create-home nova

# Copy binary from builder
COPY --from=builder /build/target/release/nova-edge /usr/local/bin/nova-edge

# Create cert volume directory
RUN mkdir -p /var/lib/nova-edge/certs \
    && chown -R nova:nova /var/lib/nova-edge

# Expose ports: HTTP, HTTPS, Admin API, Tunnel
EXPOSE 80 443 8790 9443

# Health check via admin API
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8790/health || exit 1

# Volume for TLS cert cache
VOLUME ["/var/lib/nova-edge/certs"]

USER nova

ENTRYPOINT ["nova-edge"]
