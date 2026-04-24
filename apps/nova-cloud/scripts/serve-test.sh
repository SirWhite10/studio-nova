#!/bin/bash
# Start the test development server
# Usage: ./scripts/serve-test.sh [port]

PORT=${1:-5174}
DATA_DIR=${NOVA_DATA_DIR:-"$HOME/.nova-test-skills"}

echo "Starting test server on http://localhost:$PORT"
echo "Using data directory: $DATA_DIR"
echo "Press Ctrl+C to stop"

export NOVA_DATA_DIR="$DATA_DIR"
export PORT="$PORT"

cd "$(dirname "$0")/../nova-sveltekit-test"
bun run dev
