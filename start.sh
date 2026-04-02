#!/bin/bash
# ── MLAMS Startup Script ──────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_FILE="$SCRIPT_DIR/.server.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║   MLAMS — Manpower Management System         ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── LOAD ENVIRONMENT ──
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo -e "${YELLOW}ℹ️  Loading environment from .env${NC}"
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

# ── STOP EXISTING SERVER ──
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo -e "${YELLOW}⟳  Stopping existing server (PID $OLD_PID)…${NC}"
    kill "$OLD_PID" 2>/dev/null
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# Kill anything on port 5050
fuser -k 5050/tcp 2>/dev/null

# ── START BACKEND ──
PORT="${PORT:-5050}"
HOST="${HOST:-0.0.0.0}"
echo -e "${CYAN}▶  Starting backend on http://${HOST}:${PORT} …${NC}"
cd "$BACKEND_DIR"
python3 -m src.main > "$LOG_FILE" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PID_FILE"

# Wait for backend to come up
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo -e "${RED}✗  Backend failed to start. Check log:${NC}"
  cat "$LOG_FILE"
  exit 1
fi

echo -e "${GREEN}✓  Backend running (PID $BACKEND_PID)${NC}"
echo ""

# ── PRINT INFO ──
echo -e "${BOLD}📋 Login Info:${NC}"
echo -e "   If the database was just initialized, a default admin account was created."
echo -e "   Check your ${CYAN}ADMIN_EMAIL${NC} and ${CYAN}ADMIN_PASSWORD${NC} in the .env file."
echo ""
echo -e "${BOLD}🌐 Open in browser:${NC}"
echo -e "   ${UNDERLINE}file://$FRONTEND_DIR/index.html${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Open the frontend file directly in your browser.${NC}"
echo -e "   The backend API runs at http://${HOST}:${PORT}"
echo ""
echo -e "${BOLD}To stop the server:${NC} kill $BACKEND_PID"
echo -e "   or run:  ${CYAN}bash $SCRIPT_DIR/stop.sh${NC}"
echo ""

# ── TRY TO OPEN BROWSER ──
FRONTEND_URL="file://$FRONTEND_DIR/index.html"
if command -v xdg-open &>/dev/null; then
  xdg-open "$FRONTEND_URL" 2>/dev/null &
elif command -v open &>/dev/null; then
  open "$FRONTEND_URL" 2>/dev/null &
fi

echo -e "${GREEN}✓  MLAMS is ready!${NC}"
echo ""
echo "Backend log: $LOG_FILE"
echo "Press Ctrl+C to stop…"
echo ""

# Keep running and tail log
trap "echo ''; echo 'Stopping…'; kill $BACKEND_PID 2>/dev/null; rm -f $PID_FILE; exit 0" INT TERM
wait $BACKEND_PID
