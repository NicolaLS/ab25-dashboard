#!/usr/bin/env bash
#
# create-token.sh - Generate a random admin token and export it
#

# Generate a secure random token
TOKEN=$(openssl rand -hex 24)

# Export it
export ADMIN_TOKEN="$TOKEN"

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}✓ Generated new admin token: $TOKEN${NC}"
echo -e "\nTo use this token in your current shell, run:"
echo -e "  export ADMIN_TOKEN=\"$TOKEN\""
echo -e "\nOr source this script:"
echo -e "  source ./_tools/create-token.sh"
