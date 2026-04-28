#!/usr/bin/env sh
set -eu

GO_VERSION="${GO_VERSION:-1.25.0}"
OUTPUT_DIR="${OUTPUT_DIR:-}"
INSTALL_DEPS="${INSTALL_DEPS:-1}"
INSTALL_GO="${INSTALL_GO:-1}"

usage() {
  cat <<EOF
Build Nova custom frp binaries on Debian.

Usage:
  apps/nova-frp/scripts/build-debian.sh [--no-deps] [--no-go-install] [--output-dir DIR]

Environment:
  GO_VERSION     Go version to require/install. Default: ${GO_VERSION}
  OUTPUT_DIR     Build output directory. Default: apps/nova-frp/dist/nova-frp-<os>-<arch>
  INSTALL_DEPS   Install apt dependencies when set to 1. Default: ${INSTALL_DEPS}
  INSTALL_GO     Install official Go when missing/wrong version. Default: ${INSTALL_GO}

Examples:
  ./apps/nova-frp/scripts/build-debian.sh
  INSTALL_DEPS=0 ./apps/nova-frp/scripts/build-debian.sh
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --no-deps)
      INSTALL_DEPS=0
      ;;
    --no-go-install)
      INSTALL_GO=0
      ;;
    --output-dir)
      shift
      if [ "$#" -eq 0 ]; then
        echo "missing value for --output-dir" >&2
        exit 2
      fi
      OUTPUT_DIR="$1"
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
FRP_DIR=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)

run_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "root privileges are required for: $*" >&2
    echo "run as root or install sudo" >&2
    exit 1
  fi
}

install_debian_deps() {
  if [ "${INSTALL_DEPS}" != "1" ]; then
    return
  fi
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "apt-get not found; skipping Debian dependency install"
    return
  fi
  run_root apt-get update
  run_root apt-get install -y ca-certificates curl git tar build-essential
}

machine_arch() {
  arch=$(uname -m)
  case "$arch" in
    x86_64|amd64) echo "amd64" ;;
    aarch64|arm64) echo "arm64" ;;
    *)
      echo "unsupported architecture: $arch" >&2
      exit 1
      ;;
  esac
}

go_version() {
  if command -v go >/dev/null 2>&1; then
    go version | awk '{print $3}' | sed 's/^go//'
  fi
}

install_go() {
  current="$(go_version || true)"
  if [ "$current" = "$GO_VERSION" ]; then
    return
  fi
  if [ "${INSTALL_GO}" != "1" ]; then
    echo "Go ${GO_VERSION} is required, found: ${current:-missing}" >&2
    exit 1
  fi

  go_arch=$(machine_arch)
  archive="go${GO_VERSION}.linux-${go_arch}.tar.gz"
  url="https://go.dev/dl/${archive}"
  tmp="/tmp/${archive}"

  echo "Installing Go ${GO_VERSION} from ${url}"
  curl -fsSL "$url" -o "$tmp"
  run_root rm -rf /usr/local/go
  run_root tar -C /usr/local -xzf "$tmp"
}

ensure_go_path() {
  export PATH="/usr/local/go/bin:${PATH}"
  if ! command -v go >/dev/null 2>&1; then
    echo "go was not found after installation" >&2
    exit 1
  fi
  current="$(go_version)"
  if [ "$current" != "$GO_VERSION" ]; then
    echo "Go ${GO_VERSION} is required, found: ${current}" >&2
    exit 1
  fi
}

build_frp() {
  os_name="linux"
  arch_name=$(machine_arch)
  if [ -z "$OUTPUT_DIR" ]; then
    OUTPUT_DIR="${FRP_DIR}/dist/nova-frp-${os_name}-${arch_name}"
  fi

  rm -rf "$OUTPUT_DIR"
  mkdir -p "$OUTPUT_DIR"

  cd "$FRP_DIR"
  echo "Building Nova frps/frpc in ${FRP_DIR}"
  echo "Output: ${OUTPUT_DIR}"
  go version

  CGO_ENABLED=0 GOOS="$os_name" GOARCH="$arch_name" \
    go build -trimpath -ldflags "-s -w" -tags "frps,noweb" -o "${OUTPUT_DIR}/frps" ./cmd/frps
  CGO_ENABLED=0 GOOS="$os_name" GOARCH="$arch_name" \
    go build -trimpath -ldflags "-s -w" -tags "frpc,noweb" -o "${OUTPUT_DIR}/frpc" ./cmd/frpc

  chmod +x "${OUTPUT_DIR}/frps" "${OUTPUT_DIR}/frpc"
  tarball="${OUTPUT_DIR}.tar.gz"
  rm -f "$tarball"
  tar -C "$(dirname "$OUTPUT_DIR")" -czf "$tarball" "$(basename "$OUTPUT_DIR")"

  echo
  echo "Built:"
  ls -lh "${OUTPUT_DIR}/frps" "${OUTPUT_DIR}/frpc" "$tarball"
  echo
  echo "Next:"
  echo "  sudo mkdir -p /opt/nova-frp"
  echo "  sudo tar -xzf ${tarball} -C /opt/nova-frp --strip-components=1"
  echo "  /opt/nova-frp/frps -c /etc/nova-frp/frps.toml nova-smoke --frpc-binary /opt/nova-frp/frpc --host test.workspace.dlxstudios.com --timeout 5m"
}

install_debian_deps
install_go
ensure_go_path
build_frp
