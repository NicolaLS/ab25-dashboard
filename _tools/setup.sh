#!/usr/bin/env bash
#
# setup.sh - Initial project setup
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Initial Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check Go
echo -e "${BLUE}→ Checking Go installation...${NC}"
if ! command -v go &> /dev/null; then
    echo -e "${YELLOW}⚠ Go is not installed. Please install Go 1.21 or later.${NC}"
    exit 1
fi
GO_VERSION=$(go version | awk '{print $3}')
echo -e "${GREEN}✓ Found $GO_VERSION${NC}\n"

# Check Node
echo -e "${BLUE}→ Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠ Node.js is not installed. Please install Node.js 18 or later.${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Found Node.js $NODE_VERSION${NC}\n"

# Install backend dependencies
echo -e "${BLUE}→ Installing backend dependencies...${NC}"
cd "$PROJECT_ROOT/backend"
go mod download
echo -e "${GREEN}✓ Backend dependencies installed${NC}\n"

# Install frontend dependencies
echo -e "${BLUE}→ Installing frontend dependencies...${NC}"
cd "$PROJECT_ROOT/frontend"
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}\n"

# Run backend tests
echo -e "${BLUE}→ Running backend tests...${NC}"
cd "$PROJECT_ROOT/backend"
go test ./...
echo -e "${GREEN}✓ Backend tests passed${NC}\n"

# Generate admin token
echo -e "${BLUE}→ Generating admin token...${NC}"
TOKEN=$(openssl rand -hex 24)
echo -e "${GREEN}✓ Generated admin token: $TOKEN${NC}\n"

# Create .env file
echo -e "${BLUE}→ Creating .env file...${NC}"
cat > "$PROJECT_ROOT/backend/.env" << EOF
# Adopting Bitcoin Dashboard Configuration
# Generated on $(date)

# Admin token for protected endpoints
ADMIN_TOKEN=$TOKEN

# Server configuration
ADDR=:8080

# Database
DB_PATH=./data/dashboard.db

# Polling configuration
POLL_INTERVAL=5m
POLL_CONCURRENCY=5
HTTP_TIMEOUT=10s

# Data source
DATA_API_BASE_URL=https://api.paywithflash.com

# Rate calculation window
RATE_WINDOW=5m

# API limits
TICKER_LIMIT=20
DEFAULT_LEADERBOARD_LIMIT=10

# CORS (use * for development, specific origins for production)
CORS_ORIGINS=*
EOF
echo -e "${GREEN}✓ Created backend/.env${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}\n"
echo -e "  Your admin token: ${GREEN}$TOKEN${NC}"
echo -e "\n  Next steps:"
echo -e "  1. Export the admin token: ${BLUE}export ADMIN_TOKEN=\"$TOKEN\"${NC}"
echo -e "  2. Start dev environment:  ${BLUE}./_tools/dev.sh${NC}"
echo -e "  3. Or start separately:"
echo -e "     - Backend only:  ${BLUE}./_tools/server.sh${NC}"
echo -e "     - Frontend only: ${BLUE}./_tools/frontend.sh${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
