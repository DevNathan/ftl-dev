# Vim plugin versioning (`ftl-dev.vim`)

Canonical version for the Vim / Neovim runtime is **`vim/VERSION`** (plain semver, one line).

This is **independent** of the VS Code extension version in [`extension/package.json`](../extension/package.json). Bumping one does not require bumping the other.

See also: [publishing-vim.md](publishing-vim.md), [versioning.md](versioning.md) (extension).

## Scheme

Same semver rules as the extension (`MAJOR.MINOR.PATCH`). Current release line: `1.1.x`.

| Bump | When |
|------|------|
| **PATCH** | Syntax/indent/ftplugin fixes, docs in `vim/` |
| **MINOR** | New user-visible Vim runtime features |
| **MAJOR** | Breaking filetype / runtimepath behavior |

## Release-prep (monorepo)

1. Edit files under [`vim/`](../vim/).
2. Set [`vim/VERSION`](../vim/VERSION) to a version **not yet tagged** on `ftl-dev.vim`.
3. Move bullets in [`vim/CHANGELOG.md`](../vim/CHANGELOG.md) from `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`.
4. Commit on **this** repo (`ftl-dev`).
5. Publish the mirror (next section / [publishing-vim.md](publishing-vim.md)).

## Tags

| Where | Tag shape | Example |
|-------|-----------|---------|
| Publish repo `ftl-dev.vim` | `v` + `vim/VERSION` | `v0.1.0` |
| Optional on monorepo `ftl-dev` | `vim-v` + version | `vim-v0.1.0` |

Do not reuse an extension tag like `v0.0.14` for the Vim plugin unless the numbers genuinely match both products (they usually should not).
