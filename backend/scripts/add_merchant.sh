#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "ADMIN_TOKEN environment variable must be set" >&2
  exit 1
fi

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <merchant_id> <public_key> [alias] [api_base]" >&2
  echo "Defaults: alias='Merchant <id>', api_base=\${API_BASE_URL:-http://localhost:8080}" >&2
  exit 1
fi

MERCHANT_ID="$1"
PUBLIC_KEY="$2"
ALIAS="${3:-Merchant ${MERCHANT_ID}}"
API_BASE="${4:-${API_BASE_URL:-http://localhost:8080}}"

export MERCHANT_ID PUBLIC_KEY ALIAS

PAYLOAD="$(python3 - <<'PY'
import json, os, sys
merchant_id = os.environ["MERCHANT_ID"]
public_key = os.environ["PUBLIC_KEY"]
alias = os.environ["ALIAS"]
print(json.dumps({
    "id": merchant_id,
    "public_key": public_key,
    "alias": alias,
    "enabled": True,
}))
PY
)"

curl -sS -X POST "${API_BASE}/v1/admin/merchants" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}"
