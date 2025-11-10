#!/usr/bin/env bash
#
# server.sh - Run the backend server
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
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Backend Server${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if admin token exists
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠ No ADMIN_TOKEN found, generating one...${NC}"
    source "$SCRIPT_DIR/create-token.sh"
fi

echo -e "${GREEN}✓ Admin Token: $ADMIN_TOKEN${NC}"
echo -e "${BLUE}→ Starting backend server...${NC}\n"

cd "$PROJECT_ROOT/backend"
exec go run ./cmd/server
