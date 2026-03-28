#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-setup}"
DB_URL="${DATABASE_URL:-postgresql://linguist:linguist@localhost:5433/linguist}"

case "$ACTION" in
  setup)
    echo ""
    echo "  ╔══════════════════════════════════════╗"
    echo "  ║   Integration Test Environment Setup ║"
    echo "  ╚══════════════════════════════════════╝"
    echo ""

    if docker compose ps --format json 2>/dev/null | grep -q "linguist-postgres"; then
      echo "  [1/5] Docker containers already running"
    else
      echo "  [1/5] Starting Docker containers..."
      docker compose up -d
      echo "  STARTED_DOCKER=true" > /tmp/linguist-test-state
    fi

    echo "  [2/5] Waiting for PostgreSQL..."
    for i in $(seq 1 30); do
      if docker exec linguist-postgres pg_isready -U linguist -d linguist >/dev/null 2>&1; then
        break
      fi
      if [ "$i" = "30" ]; then
        echo "  ✗ PostgreSQL failed to start" >&2
        exit 1
      fi
      sleep 1
    done

    echo "  [3/5] Resetting database..."
    docker exec linguist-postgres psql -U linguist -d linguist \
      -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
    DATABASE_URL="$DB_URL" npx drizzle-kit push --force 2>&1 | tail -1

    echo "  [4/5] Seeding test data..."
    DATABASE_URL="$DB_URL" npx tsx scripts/seed.ts >/dev/null 2>&1

    echo "  [5/5] Starting dev server..."
    lsof -ti:5173 | xargs kill 2>/dev/null || true
    DATABASE_URL="$DB_URL" AI_MODE=mock nohup npm run dev > /tmp/linguist-test-dev.log 2>&1 &
    echo "$!" >> /tmp/linguist-test-state

    for i in $(seq 1 30); do
      if curl -sf http://localhost:5173/api/health >/dev/null 2>&1; then
        echo "  ✓ Test environment ready"
        echo ""
        exit 0
      fi
      sleep 1
    done

    echo "  ✗ Dev server failed to start" >&2
    cat /tmp/linguist-test-dev.log | tail -10 >&2
    exit 1
    ;;

  teardown)
    echo ""
    echo "  Cleaning up test environment..."
    lsof -ti:5173 | xargs kill 2>/dev/null || true
    echo "  ✓ Dev server stopped"

    if [ -f /tmp/linguist-test-state ] && grep -q "STARTED_DOCKER=true" /tmp/linguist-test-state 2>/dev/null; then
      docker compose down 2>/dev/null
      echo "  ✓ Docker containers stopped"
    fi

    rm -f /tmp/linguist-test-state
    echo "  ✓ Teardown complete"
    echo ""
    ;;

  *)
    echo "Usage: $0 {setup|teardown}" >&2
    exit 1
    ;;
esac
