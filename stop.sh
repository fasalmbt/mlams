#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.server.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  kill "$PID" 2>/dev/null && echo "✓ Server stopped (PID $PID)" || echo "Server not running"
  rm -f "$PID_FILE"
else
  fuser -k 5050/tcp 2>/dev/null && echo "✓ Port 5050 cleared" || echo "Nothing to stop"
fi
