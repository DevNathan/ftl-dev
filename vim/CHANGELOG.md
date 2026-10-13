# Changelog — ftl-dev.vim

User-facing notes for the **Vim / Neovim** FreeMarker runtime (`ftl-dev.vim`).

Versioning is **independent** of the VS Code extension. Canonical file: [`VERSION`](VERSION). Process (monorepo docs): https://github.com/DevNathan/ftl-dev/blob/main/docs/versioning-vim.md

## [Unreleased]

## [0.2.0] - 2026-10-13

First coherent release. Consolidates the 0.1.x hotfix mess into one runtime that loads cleanly and paints correctly on light and dark terminal themes.

### Added

- Vim runtime: `ftdetect`, `syntax`, `indent`, `ftplugin` for FreeMarker (`.ftl` / `.ftlh` / `.ftlx`)
- Nested FTL comments; angle/square directives; `${…}` interpolations
- Layered highlight groups: `#assign` → `ftlDirKeyword`, vars → `ftlIdentifier`, `.method` → `ftlMethod`, `?builtin` → `ftlBuiltin`
- Groups **link to the colorscheme** (`Statement`, `Identifier`, `Function`, `Special`, …) — no hardcoded near-white `guifg`/`ctermfg`
- Optional Neovim LSP helper (`lua/ftl_dev/lsp.lua`) — language server built separately
- Vader + Neovim lua suite with coverage inventory (`bash test/run.sh`)
- Syntax smoke gate (`syntax_smoke.vim`) fails on E866/E475 load errors

### Fixed

- `indentkeys` avoids `[` / `<#` (Vim 8.1 E518); indent helpers in `autoload/ftl_dev/indent.vim`
- Vim NFA: literal `?` for builtins (`\?` is a quantifier); no `[\w]` inside `[]` (not a word class)
- Transparent directive/interpolation regions — not one solid colour slab
- No HTML-base / `matchgroup` steal mid-directive name

## [0.1.3] - 2026-10-13

Superseded by 0.2.0 (layered groups + smoke gate; still used absolute colours).

## [0.1.2] - 2026-10-13

Superseded by 0.2.0 (literal `?` for builtins).

## [0.1.1] - 2026-10-13

Superseded by 0.2.0 (initial runtime + tests).
