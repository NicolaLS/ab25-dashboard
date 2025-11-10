#!/usr/bin/env bash
#
# test.sh - Run all tests (backend and frontend)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adopting Bitcoin Dashboard - Test Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

FAILED=0

# Test backend
echo -e "${BLUE}→ Running backend tests...${NC}"
cd "$PROJECT_ROOT/backend"
if go test -v ./...; then
    echo -e "${GREEN}✓ Backend tests passed${NC}\n"
else
    echo -e "${RED}✗ Backend tests failed${NC}\n"
    FAILED=1
fi

# Test frontend (if test script exists)
echo -e "${BLUE}→ Running frontend tests...${NC}"
cd "$PROJECT_ROOT/frontend"
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    if npm test; then
        echo -e "${GREEN}✓ Frontend tests passed${NC}\n"
    else
        echo -e "${RED}✗ Frontend tests failed${NC}\n"
        FAILED=1
    fi
else
    echo -e "${BLUE}ℹ No frontend tests configured${NC}\n"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}\n"
else
    echo -e "${RED}✗ Some tests failed${NC}\n"
    exit 1
fi
