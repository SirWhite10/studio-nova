#!/bin/bash
# Cleanup test data
# WARNING: This will delete all test skills!

DATA_DIR=${NOVA_DATA_DIR:-"$HOME/.nova-test-skills"}

if [ -d "$DATA_DIR/skills" ]; then
  echo "Removing test skills from $DATA_DIR..."
  rm -rf "$DATA_DIR/skills"
  echo "Done."
else
  echo "No test data found at $DATA_DIR/skills"
fi
