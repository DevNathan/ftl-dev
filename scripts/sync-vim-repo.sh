#!/usr/bin/env bash
# Sync monorepo vim/ → remote ftl-dev.vim
#   git remote add vim-publish https://github.com/DevNathan/ftl-dev.vim.git
#   ./scripts/sync-vim-repo.sh
#   ./scripts/sync-vim-repo.sh --tag
#   ./scripts/sync-vim-repo.sh --tag --force

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="${VIM_PUBLISH_REMOTE:-vim-publish}"
BRANCH="${VIM_PUBLISH_BRANCH:-main}"
PUSH_TAG=0
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --tag) PUSH_TAG=1 ;;
    --force) FORCE=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

VERSION="$(tr -d '[:space:]' < vim/VERSION)"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "vim/VERSION must be semver X.Y.Z, got: $VERSION" >&2
  exit 1
fi

if ! git remote | grep -qx "$REMOTE"; then
  cat >&2 <<EOF
Remote '$REMOTE' not found.
  git remote add $REMOTE https://github.com/DevNathan/ftl-dev.vim.git
EOF
  exit 1
fi

SPLIT_BRANCH="vim-publish-split"
git branch -D "$SPLIT_BRANCH" 2>/dev/null || true
echo "Splitting prefix=vim → $SPLIT_BRANCH …"
git subtree split --prefix=vim -b "$SPLIT_BRANCH"

if [[ "$FORCE" -eq 1 ]]; then
  git push --force-with-lease "$REMOTE" "${SPLIT_BRANCH}:${BRANCH}"
else
  git push "$REMOTE" "${SPLIT_BRANCH}:${BRANCH}"
fi

if [[ "$PUSH_TAG" -eq 1 ]]; then
  TAG="v${VERSION}"
  git tag -d "$TAG" 2>/dev/null || true
  git tag -a "$TAG" -m "$TAG" "$SPLIT_BRANCH"
  git push "$REMOTE" "refs/tags/$TAG"
  echo "Also consider: git tag -a vim-$TAG -m vim-$TAG && git push origin vim-$TAG"
fi

echo "Done. Plug 'DevNathan/ftl-dev.vim' (version $VERSION)"
