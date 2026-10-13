# ADR 0005: Vim / Neovim port and shared LSP

- Status: Accepted
- Date: 2026-10-13

## Context

ftl-dev ships as a CodeOSS extension ([ADR 0001](0001-codeoss-language-stack.md)). Users also want FreeMarker tooling in **Vim** and **Neovim**. Syntax highlighting is mandatory; IDE features should reuse the existing TypeScript language logic where possible.

## Decision

1. **Syntax (required)** — Ship a Vim runtime under [`vim/`](../../vim/) (`ftdetect`, `syntax`, `indent`, `ftplugin`). Neovim uses the same runtime via `runtimepath`. Optional [`tree-sitter-freemarker/`](../../tree-sitter-freemarker/) is a Neovim-oriented scaffold; it is not required for v1 highlighting.
2. **Language features** — Extract a **stdio language server** under [`server/`](../../server/) that imports pure modules from `extension/src` (diagnostics, symbols, completions, signature help, outline, references, document links). Vim/Neovim clients speak LSP; VS Code may migrate to the same server later.
3. **Editor-local UX** — Indent (`indentexpr`), `commentstring`, matchit words, light auto-pairs, and `gf`/`includeexpr` live in the Vim runtime — not in the LSP.
4. **Out of scope for the Vim/Neovim port (initial)** — Comparison-operator presentation (`gte`→`>=` via decorations, [ADR 0003](0003-comparison-operator-presentation.md)). Conceal could approximate it later; caret-reveal UX is VS Code–specific and is **not** duplicated in the language server.

## Capability matrix

Canonical table: [docs/product/vim-neovim-matrix.md](../product/vim-neovim-matrix.md).

## Distribution

- **Source of truth:** monorepo [`vim/`](../../vim/) (this workspace stays intact).
- **User-facing install:** separate GitHub repo **`DevNathan/ftl-dev.vim`**, Pathogen / Vundle / vim-plug style (same pattern as typical Vim plugins). Tree root equals `vim/`.
- **Versioning:** [`vim/VERSION`](../../vim/VERSION) — independent of `extension/package.json`. Process: [versioning-vim.md](../versioning-vim.md), [publishing-vim.md](../publishing-vim.md), [`scripts/sync-vim-repo.ps1`](../../scripts/sync-vim-repo.ps1).
- **Language server:** stays in the monorepo for contributors only — **not** npm-published; not required to use `ftl-dev.vim`.

## Consequences

- TextMate grammar is **not** reused as-is; Vim syntax (and optional tree-sitter) are maintained in parallel with parity goals documented in the matrix.
- Publishing the VS Code VSIX does not publish the Vim runtime; sync the mirror with the script after bumping `vim/VERSION`.
- Do not add VS Code decoration features to `server/`.
