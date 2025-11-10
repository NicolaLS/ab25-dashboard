#!/usr/bin/env bash
#
# print-token.sh - Print the current admin token
#

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}✗ No ADMIN_TOKEN environment variable set${NC}"
    echo -e "\n${YELLOW}Generate one with:${NC}"
    echo -e "  source ./_tools/create-token.sh"
    exit 1
fi

echo -e "${GREEN}Admin Token:${NC} $ADMIN_TOKEN"
echo -e "\n${GREEN}Usage examples:${NC}"
echo -e "\n# Login (returns ok status)"
echo -e "curl -X POST http://localhost:8080/v1/admin/auth/login \\"
echo -e "  -H 'Content-Type: application/json' \\"
echo -e "  -d '{\"token\":\"$ADMIN_TOKEN\"}'"
echo -e "\n# List merchants (requires auth)"
echo -e "curl http://localhost:8080/v1/admin/merchants \\"
echo -e "  -H 'Authorization: Bearer $ADMIN_TOKEN'"
