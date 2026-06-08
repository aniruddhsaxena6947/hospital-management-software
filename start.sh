#!/bin/bash
# Cross-platform launcher (Linux / macOS terminal)
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
PORT=3000
URL="http://localhost:${PORT}/index.html"

echo ""
echo "  MediCore HMS — starting…"
echo ""

lsof -ti tcp:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true

if [ ! -d "server/node_modules" ]; then
  echo "  ⏳ Installing backend dependencies (first run)…"
  (cd server && npm install --no-audit --no-fund)
fi

(cd server && node server.js) > /tmp/medicore.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > /tmp/medicore.pid

for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 0.7
  lsof -ti tcp:$PORT >/dev/null 2>&1 && break
done

if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  echo "  ✓ $URL"
  echo "  ✓ Demo login: admin@medicore.health / medicore123"
  [ -n "$DISPLAY" ] && xdg-open "$URL" 2>/dev/null
  command -v open >/dev/null 2>&1 && open "$URL" 2>/dev/null
  echo ""
  echo "  Ctrl+C to stop"
  trap "kill $SERVER_PID 2>/dev/null; rm -f /tmp/medicore.pid" EXIT
  wait $SERVER_PID
else
  echo "  ✗ Failed. See /tmp/medicore.log"
  tail -20 /tmp/medicore.log
  exit 1
fi
