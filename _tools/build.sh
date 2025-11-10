#!/usr/bin/env bash
#
# build.sh - Build both backend and frontend for production
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Production Build${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Build backend
echo -e "${BLUE}→ Building backend...${NC}"
cd "$PROJECT_ROOT/backend"
go build -o ../dist/dashboard-server ./cmd/server
echo -e "${GREEN}✓ Backend built: dist/dashboard-server${NC}\n"

# Build frontend
echo -e "${BLUE}→ Building frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run build
echo -e "${GREEN}✓ Frontend built: frontend/dist${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Build complete!${NC}\n"
echo -e "  Backend binary: ${BLUE}dist/dashboard-server${NC}"
echo -e "  Frontend dist:  ${BLUE}frontend/dist/${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
