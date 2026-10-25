#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "======================================================================"
echo " Running Premier League Studio E2E Verification Suite"
echo "======================================================================"

backend/.venv/bin/pytest tests/e2e/ -v "$@"
