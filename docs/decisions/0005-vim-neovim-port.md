# ADR 0005: Vim / Neovim port and shared LSP

- Status: Accepted (amended 2026-10-13 — separate git repos)
- Date: 2026-10-13

## Context

ftl-dev ships as a CodeOSS extension ([ADR 0001](0001-codeoss-language-stack.md)). Users also want FreeMarker tooling in **Vim** and **Neovim**. Syntax highlighting is mandatory; IDE features should reuse the existing TypeScript language logic where possible.

A monorepo `vim/` folder plus subtree sync to `ftl-dev.vim` caused mixed git roots and accidental cross-repo pushes. Vim must stay a **lightweight, independently versioned** install target.

## Decision

1. **Syntax (required)** — Lives only in the **[`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim)** repository (`ftdetect`, `syntax`, `indent`, `ftplugin`). Neovim uses the same runtime via `runtimepath`. Optional [`tree-sitter-freemarker/`](../../tree-sitter-freemarker/) remains in **this** (VSIX) repo as a contributor scaffold; it is not required for v1 highlighting and is **not** shipped inside `ftl-dev.vim`.
2. **Language features** — Extract a **stdio language server** under [`server/`](../../server/) that imports pure modules from `extension/src`. Vim/Neovim clients speak LSP; VS Code may migrate to the same server later. The server is **not** part of the `ftl-dev.vim` download.
3. **Editor-local UX** — Indent, `commentstring`, matchit, light auto-pairs, and `gf`/`includeexpr` live in `ftl-dev.vim` — not in the LSP.
4. **Repository split** — Workspace layout is `vsix/` (this git → `DevNathan/ftl-dev`) and `vim/` (separate git → `DevNathan/ftl-dev.vim`). No parent umbrella `.git`. No subtree sync script.
5. **Out of scope for the Vim/Neovim port (initial)** — Comparison-operator presentation (`gte`→`>=` via decorations, [ADR 0003](0003-comparison-operator-presentation.md)).

## Capability matrix

Canonical table: [docs/product/vim-neovim-matrix.md](../product/vim-neovim-matrix.md).

## Distribution

- **Source of truth for Vim:** [`DevNathan/ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim) only.
- **Install:** Pathogen / Vundle / vim-plug / lazy.nvim against that repo.
- **Versioning:** `VERSION` + `CHANGELOG.md` inside `ftl-dev.vim`; tags `vX.Y.Z` on that remote. Independent of `extension/package.json`.
- **Language server:** this repo only — **not** npm-published; not required to use `ftl-dev.vim`.

## Consequences

- TextMate grammar is **not** reused as-is; Vim syntax (and optional tree-sitter) are maintained in parallel with parity goals documented in the matrix.
- Publishing the VS Code VSIX does not publish the Vim runtime; release Vim from the `ftl-dev.vim` checkout.
- Do not add VS Code decoration features to `server/`.
- Agents must not edit `../vim` when working in this repo unless the user opens the vim workspace folder explicitly as its own project.
