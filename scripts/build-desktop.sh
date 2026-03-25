#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Building frontend..."
cd frontend && npm run build && cd ..

echo "==> Building Python backend binary..."
source .venv/bin/activate 2>/dev/null || true
pyinstaller repocheck.spec --noconfirm

echo "==> Building Electron app + .dmg..."
npx electron-builder --mac

echo ""
echo "Done. Output:"
ls -lh dist/*.dmg 2>/dev/null || echo "  (check dist/ for output)"
