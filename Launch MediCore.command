#!/bin/bash
# ============================================================================
#  MediCore HMS — one-click launcher (macOS)
#  Double-click this file to install (first time) and start the app.
# ============================================================================

set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
PORT=3000
URL="http://localhost:${PORT}/index.html"

# Pretty header
echo ""
echo "  ┌────────────────────────────────────────────┐"
echo "  │   MediCore — Hospital Management System    │"
echo "  │   Server starting on http://localhost:$PORT │"
echo "  └────────────────────────────────────────────┘"
echo ""

# Kill anything already on the port
lsof -ti tcp:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true

# Install dependencies on first run
if [ ! -d "server/node_modules" ]; then
  echo "  ⏳ First run — installing backend dependencies…"
  (cd server && npm install --no-audit --no-fund) || {
    echo "  ✗ npm install failed. Make sure Node.js 18+ is installed.";
    read -p "  Press Enter to close…"; exit 1;
  }
  echo "  ✓ Dependencies installed"
  echo ""
fi

# Start the server in the background and capture its PID
(cd server && node server.js) > /tmp/medicore.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > /tmp/medicore.pid

cleanup() {
  if [ -f /tmp/medicore.pid ]; then
    kill "$(cat /tmp/medicore.pid)" 2>/dev/null || true
    rm -f /tmp/medicore.pid
  fi
}
trap cleanup EXIT INT TERM

# Wait until the server is ready
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 0.7
  if lsof -ti tcp:$PORT >/dev/null 2>&1; then break; fi
done

if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  echo "  ✓ Server running"
  echo ""
  echo "  → $URL"
  echo "  → Demo login:  admin@medicore.health / medicore123"
  echo ""
  open "$URL" 2>/dev/null || open "http://localhost:$PORT"
else
  echo "  ✗ Server failed to start. Check /tmp/medicore.log"
  tail -20 /tmp/medicore.log
  read -p "  Press Enter to close…"
  exit 1
fi

echo "  Press Ctrl+C in this window to stop the server."
echo ""
wait $SERVER_PID 2>/dev/null || true
