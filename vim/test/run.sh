#!/usr/bin/env bash
# Run ftl-dev.vim Vader suite and assert coverage inventory is fully tagged.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST="$ROOT/test"
VENDOR="$TEST/vendor/vader.vim"
INV="$TEST/coverage_inventory.json"

if [[ ! -d "$VENDOR/.git" && ! -f "$VENDOR/plugin/vader.vim" ]]; then
  echo "Fetching vader.vim…"
  mkdir -p "$TEST/vendor"
  git clone --depth 1 https://github.com/junegunn/vader.vim.git "$VENDOR"
fi

# Every inventory id must appear as: coverage: <id> under test/ (vader or lua)
missing=0
while IFS= read -r id; do
  if ! grep -Rqh "coverage: ${id}" "$TEST/vader" "$TEST/lua"; then
    echo "MISSING coverage tag for: $id"
    missing=1
  fi
done < <(python3 -c "import json,sys; print('\n'.join(u['id'] for u in json.load(open(sys.argv[1]))['units']))" "$INV")

if [[ "$missing" -ne 0 ]]; then
  echo "Coverage inventory incomplete."
  exit 1
fi
echo "Coverage inventory: 100% of units tagged in vader cases."

export VIMINIT=
vim -Nu "$TEST/vimrc" -c "Vader! $TEST/vader/*.vader" -c 'qa!'
echo "Vader suite passed."

if command -v nvim >/dev/null 2>&1; then
  nvim --headless -u NONE \
    -c "set rtp^=$ROOT" \
    -c "luafile $TEST/lua/lsp_test.lua" \
    -c "qa!"
  echo "Neovim lua lsp tests passed."
else
  echo "nvim not found — skipping lua/ftl_dev/lsp.lua tests (install neovim for full 100%)."
  exit 1
fi

echo "All vim tests passed (inventory 100% + vader + lua)."
