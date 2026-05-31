#!/usr/bin/env bash
#
# deploy.sh — VPS deployment script for Nova Edge
#
# Usage: ./deploy/deploy.sh [--rollback]
#
# Prerequisites:
#   - Git clone of the repo at /opt/nova-edge
#   - Rust toolchain installed (rustup)
#   - systemd service file installed at /etc/systemd/system/nova-edge.service
#   - Environment file at /etc/nova-edge/env
#
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────
REPO_DIR="/opt/nova-edge"
BINARY_NAME="nova-edge"
INSTALL_DIR="/usr/local/bin"
SERVICE_NAME="nova-edge"
HEALTH_URL="http://localhost:8790/health"
HEALTH_RETRIES=30
HEALTH_INTERVAL=2
BUILD_TIMEOUT=600
BACKUP_DIR="/var/lib/nova-edge/backups"

# ── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Rollback support ─────────────────────────────────────────────────
if [[ "${1:-}" == "--rollback" ]]; then
    info "Rolling back to previous binary..."
    LATEST_BACKUP=$(ls -t "${BACKUP_DIR}/${BINARY_NAME}".* 2>/dev/null | head -1)
    if [[ -z "${LATEST_BACKUP}" ]]; then
        error "No backup found to roll back to"
    fi

    sudo systemctl stop "${SERVICE_NAME}" || true
    sudo cp "${LATEST_BACKUP}" "${INSTALL_DIR}/${BINARY_NAME}"
    sudo chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
    sudo systemctl start "${SERVICE_NAME}"
    info "Rolled back to $(basename "${LATEST_BACKUP}")"
    exit 0
fi

# ── Pre-flight checks ────────────────────────────────────────────────
info "Running pre-flight checks..."

[[ -d "${REPO_DIR}" ]] || error "Repo directory not found: ${REPO_DIR}"
command -v cargo &>/dev/null || error "cargo not found — install Rust toolchain"
command -v systemctl &>/dev/null || error "systemctl not found"

# ── Pull latest code ─────────────────────────────────────────────────
info "Pulling latest changes..."
cd "${REPO_DIR}"
git fetch origin main
git reset --hard origin/main
info "Updated to $(git rev-parse --short HEAD)"

# ── Build ─────────────────────────────────────────────────────────────
info "Building release binary (timeout: ${BUILD_TIMEOUT}s)..."
if ! timeout "${BUILD_TIMEOUT}" cargo build --release 2>&1; then
    error "Build failed!"
fi

BINARY_PATH="${REPO_DIR}/target/release/${BINARY_NAME}"
[[ -f "${BINARY_PATH}" ]] || error "Binary not found at ${BINARY_PATH}"

info "Build successful: ${BINARY_PATH}"

# ── Backup current binary ────────────────────────────────────────────
sudo mkdir -p "${BACKUP_DIR}"
CURRENT_BINARY="${INSTALL_DIR}/${BINARY_NAME}"
if [[ -f "${CURRENT_BINARY}" ]]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    sudo cp "${CURRENT_BINARY}" "${BACKUP_DIR}/${BINARY_NAME}.${TIMESTAMP}"
    info "Backed up current binary to ${BACKUP_DIR}/${BINARY_NAME}.${TIMESTAMP}"

    # Keep only last 5 backups
    ls -t "${BACKUP_DIR}/${BINARY_NAME}".* 2>/dev/null | tail -n +6 | xargs -r rm -f
fi

# ── Stop old service ─────────────────────────────────────────────────
info "Stopping ${SERVICE_NAME}..."
sudo systemctl stop "${SERVICE_NAME}" || warn "Service was not running"
sleep 1

# ── Install new binary ───────────────────────────────────────────────
info "Installing new binary..."
sudo cp "${BINARY_PATH}" "${INSTALL_DIR}/${BINARY_NAME}"
sudo chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

# ── Start new service ────────────────────────────────────────────────
info "Starting ${SERVICE_NAME}..."
sudo systemctl start "${SERVICE_NAME}"

# ── Health check loop ─────────────────────────────────────────────────
info "Waiting for health check..."
for i in $(seq 1 "${HEALTH_RETRIES}"); do
    if curl -sf "${HEALTH_URL}" >/dev/null 2>&1; then
        info "Health check passed after ${i} attempt(s)"
        info "Deployment successful!"
        sudo systemctl status "${SERVICE_NAME}" --no-pager || true
        exit 0
    fi
    sleep "${HEALTH_INTERVAL}"
done

# ── Rollback on failure ──────────────────────────────────────────────
error "Health check failed after ${HEALTH_RETRIES} attempts — rolling back!"

sudo systemctl stop "${SERVICE_NAME}" || true

LATEST_BACKUP=$(ls -t "${BACKUP_DIR}/${BINARY_NAME}".* 2>/dev/null | head -1)
if [[ -n "${LATEST_BACKUP}" ]]; then
    sudo cp "${LATEST_BACKUP}" "${INSTALL_DIR}/${BINARY_NAME}"
    sudo chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
    sudo systemctl start "${SERVICE_NAME}"
    warn "Rolled back to $(basename "${LATEST_BACKUP}")"
else
    warn "No backup available for rollback"
fi

exit 1
