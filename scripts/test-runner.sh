#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Integration Test Runner (Docker)   ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

DB_URL="${DATABASE_URL:-postgresql://linguist:linguist@postgres:5432/linguist}"

echo "  [1/4] Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if pg_isready -h postgres -U linguist -d linguist -q 2>/dev/null; then
    break
  fi
  if [ "$i" = "30" ]; then
    echo "  ✗ PostgreSQL not ready after 30s" >&2
    exit 1
  fi
  sleep 1
done

echo "  [2/4] Resetting database + applying schema..."
PGPASSWORD=linguist psql -h postgres -U linguist -d linguist \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" -q 2>/dev/null
DATABASE_URL="$DB_URL" npx drizzle-kit push --force 2>&1 | tail -1

echo "  [3/4] Seeding test data..."
DATABASE_URL="$DB_URL" npx tsx scripts/seed.ts >/dev/null 2>&1

echo "  [4/4] Starting dev server + running tests..."
DATABASE_URL="$DB_URL" AI_MODE=mock npm run dev &
DEV_PID=$!

for i in $(seq 1 30); do
  if curl -sf http://localhost:5173/api/health >/dev/null 2>&1; then
    break
  fi
  if [ "$i" = "30" ]; then
    echo "  ✗ Dev server failed to start" >&2
    kill $DEV_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo "  ✓ Environment ready — running tests"
echo ""

npm run test -- --run
EXIT_CODE=$?

kill $DEV_PID 2>/dev/null || true
exit $EXIT_CODE
