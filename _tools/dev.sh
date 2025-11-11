#!/usr/bin/env bash
#
# dev.sh - Start both backend and frontend in development mode
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

SERVER_PID_FILE="/tmp/dashboard-server.pid"
FRONTEND_PID_FILE="/tmp/dashboard-frontend.pid"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Development Mode${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Stop any existing services first
if [ -f "$SERVER_PID_FILE" ] || [ -f "$FRONTEND_PID_FILE" ]; then
    echo -e "${YELLOW}→ Stopping existing services...${NC}"
    "$SCRIPT_DIR/stop.sh"
    echo ""
fi

# Check if admin token exists, if not create one
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠ No ADMIN_TOKEN found, generating one...${NC}"
    source "$SCRIPT_DIR/create-token.sh"
fi

echo -e "\n${GREEN}✓ Admin Token: $ADMIN_TOKEN${NC}\n"

# Start backend in background
echo -e "${BLUE}→ Starting backend server...${NC}"
(cd backend && go run ./cmd/server) &
BACKEND_PID=$!
echo $BACKEND_PID > "$SERVER_PID_FILE"

# Wait for backend to be ready
echo -e "${BLUE}→ Waiting for backend to be ready...${NC}"
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${YELLOW}⚠ Backend failed to start${NC}"
    rm -f "$SERVER_PID_FILE"
    exit 1
fi

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}\n"

# Start frontend in background
echo -e "${BLUE}→ Starting frontend dev server...${NC}"
(cd frontend && npm run dev) &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Development environment running!${NC}\n"
echo -e "  Backend:  ${BLUE}http://localhost:8080${NC}"
echo -e "  Frontend: ${BLUE}http://localhost:5173${NC}"
echo -e "  Admin:    ${GREEN}$ADMIN_TOKEN${NC}"
echo -e "\n  Press Ctrl+C to stop both services"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    rm -f "$SERVER_PID_FILE" "$FRONTEND_PID_FILE"
    exit
}

# Trap Ctrl+C and kill both processes
trap cleanup INT TERM EXIT

# Wait for both processes
wait
