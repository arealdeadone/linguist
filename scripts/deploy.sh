#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [ -z "${GENAI_API_KEY:-}" ]; then
  echo "ERROR: GENAI_API_KEY environment variable is not set"
  exit 1
fi

SEED="${1:-}"

echo "=== Building Docker image ==="
docker build -t linguist:latest .

echo ""
echo "=== Creating namespace ==="
kubectl apply -f k8s/namespace.yaml

echo ""
echo "=== Deploying secrets (with API key from env) ==="
envsubst < k8s/secrets.yaml | kubectl apply -f -

echo ""
echo "=== Deploying PostgreSQL ==="
if ! kubectl apply -f k8s/postgres.yaml 2>/dev/null; then
  echo "    StatefulSet has immutable field changes — recreating (PVC preserved)..."
  kubectl delete statefulset postgres -n linguist --cascade=orphan 2>/dev/null || true
  kubectl apply -f k8s/postgres.yaml
fi

echo ""
echo "=== Deploying Redis ==="
kubectl apply -f k8s/redis.yaml

echo ""
echo "=== Waiting for PostgreSQL to be ready ==="
kubectl wait --for=condition=ready pod -l app=postgres -n linguist --timeout=120s

echo ""
echo "=== Waiting for Redis to be ready ==="
kubectl wait --for=condition=ready pod -l app=redis -n linguist --timeout=60s

echo ""
echo "=== Running database migration (schema only, preserves data) ==="
kubectl port-forward -n linguist svc/postgres 5434:5432 &
PF_PID=$!
sleep 3
DATABASE_URL="postgresql://linguist:linguist@localhost:5434/linguist" npx drizzle-kit push --force 2>&1
if [ "$SEED" = "--seed" ]; then
  echo ""
  echo "=== Seeding database (first-time setup) ==="
  DATABASE_URL="postgresql://linguist:linguist@localhost:5434/linguist" npm run db:seed 2>&1
fi
kill $PF_PID 2>/dev/null || true

echo ""
echo "=== Deploying app ==="
kubectl apply -f k8s/app.yaml

echo ""
echo "=== Building worker ==="
docker build -f worker/Dockerfile -t linguist-worker:latest .

echo ""
echo "=== Deploying worker ==="
kubectl apply -f k8s/worker-deployment.yaml

echo ""
echo "=== Deploying ingress ==="
kubectl apply -f k8s/ingress.yaml

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")

echo ""
echo "=== Setting ORIGIN and restarting app ==="
kubectl set env deployment/linguist-app -n linguist ORIGIN="http://${LAN_IP}:30000"
kubectl rollout restart deployment/linguist-app -n linguist

echo ""
echo "=== Waiting for rollout to complete ==="
kubectl rollout status deployment/linguist-app -n linguist --timeout=180s

echo ""
echo "=== Starting LAN port-forward ==="
pkill -f "kubectl port-forward.*linguist-app.*30000" 2>/dev/null || true
sleep 1
nohup kubectl port-forward -n linguist svc/linguist-app --address 0.0.0.0 30000:3000 > /dev/null 2>&1 &
sleep 2

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Local:  http://localhost:30000"
echo "LAN:    http://${LAN_IP}:30000"
echo "Admin:  http://${LAN_IP}:30000/admin"
echo ""
echo "Note: First deploy? Run with --seed flag:"
echo "  npm run k8s:deploy -- --seed"
echo ""
kubectl get pods -n linguist
kubectl get pvc -n linguist
