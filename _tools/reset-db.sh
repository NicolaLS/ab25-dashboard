#!/usr/bin/env bash
#
# reset-db.sh - Reset the database (deletes all data)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$PROJECT_ROOT/backend/data/dashboard.db"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  WARNING: This will delete all data!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ -f "$DB_PATH" ]; then
    echo -e "${RED}Database found at: $DB_PATH${NC}"
    echo -e "\nAre you sure you want to delete it? (yes/no)"
    read -r CONFIRM

    if [ "$CONFIRM" = "yes" ]; then
        rm "$DB_PATH"
        echo -e "\n${GREEN}✓ Database deleted${NC}"
        echo -e "The database will be recreated on next server start.\n"
    else
        echo -e "\n${YELLOW}Cancelled${NC}\n"
        exit 0
    fi
else
    echo -e "${YELLOW}No database found at: $DB_PATH${NC}\n"
fi
