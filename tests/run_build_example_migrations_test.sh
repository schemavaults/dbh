#!/usr/bin/env bash
set -euo pipefail

TEST_ID="$$-$RANDOM"
OUTDIR="./tests/tmp/example-${TEST_ID}"

echo "=== build-db-migrations integration test (id: ${TEST_ID}) ==="

CORRECT_JS_COUNT=$(find "./src/tests/example-migrations" -maxdepth 1 -name '*.ts' | wc -l | tr -d ' ')

if [ $CORRECT_JS_COUNT -lt 2 ]; then
    echo "Expected input example migrations directory to have at least 2 migrations in it!"
    exit 1
fi

# Run the CLI build command
echo "Building example migrations..."
bun run cli build-db-migrations \
  ./src/tests/example-migrations \
  --outdir "${OUTDIR}/migrations" \
  --sql-module ./src/sql.ts \
  --sql-outdir "${OUTDIR}"

# Verify sql.js exists
if [ ! -f "${OUTDIR}/sql.js" ]; then
  echo "FAIL: ${OUTDIR}/sql.js not found"
  exit 1
fi
echo "OK: sql.js exists"

# Verify correct number of compiled migration files
JS_COUNT=$(find "${OUTDIR}/migrations" -maxdepth 1 -name '*.js' | wc -l | tr -d ' ')
if [ "${JS_COUNT}" -ne "${CORRECT_JS_COUNT}" ]; then
  echo "FAIL: expected 2 .js files in migrations dir, got ${JS_COUNT}"
  exit 1
fi
echo "OK: ${JS_COUNT} compiled migration files"

# Cleanup
rm -rf "${OUTDIR}"
echo "=== PASS ==="
