#!/bin/bash
# Shares the app on one public https link (microphone needs https) so the team can test from anywhere.
#   scripts/share_ngrok.sh            # build the frontend, start backend + preview, open the tunnel
#   scripts/share_ngrok.sh dev        # use the Vite dev server instead of the production build
# Only ONE tunnel is needed: the frontend server proxies /api to the backend on this machine.
# Ctrl+C stops everything it started. Requires `ngrok config add-authtoken <token>` once.
cd "$(dirname "$0")/.."
MODE="${1:-preview}"
PORT=4173; [ "$MODE" = "dev" ] && PORT=5173
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done; exit; }
trap cleanup INT TERM EXIT

up() { curl -s -o /dev/null -m 2 "$1"; }

if ! up http://127.0.0.1:8000/api/health; then
  echo "Starting backend on :8000 ..."
  nice -n 10 backend/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
  PIDS+=($!)
  until up http://127.0.0.1:8000/api/health; do sleep 1; done
fi

if ! up "http://127.0.0.1:$PORT/"; then
  cd frontend
  if [ "$MODE" = "dev" ]; then
    npm run dev -- --host 127.0.0.1 --port $PORT &
  else
    npm run build --silent && npm run preview -- --host 127.0.0.1 --port $PORT &
  fi
  PIDS+=($!)
  cd ..
  until up "http://127.0.0.1:$PORT/"; do sleep 1; done
fi

echo "Opening tunnel to :$PORT ..."
ngrok http $PORT --log=stdout > /tmp/vietphonics-ngrok.log &
PIDS+=($!)
for _ in $(seq 1 20); do
  URL=$(curl -s -m 2 http://127.0.0.1:4040/api/tunnels | python3 -c "import sys,json;print(next(t['public_url'] for t in json.load(sys.stdin)['tunnels'] if t['public_url'].startswith('https')))" 2>/dev/null)
  [ -n "$URL" ] && break
  sleep 1
done
[ -z "$URL" ] && { echo "ngrok did not start; see /tmp/vietphonics-ngrok.log"; exit 1; }
echo "=================================================="
echo "Public link:  $URL"
echo "Health check: $URL/api/health"
echo "Ctrl+C to stop."
echo "=================================================="
wait
