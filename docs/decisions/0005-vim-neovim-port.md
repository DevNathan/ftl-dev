# ADR 0005: Vim / Neovim port and shared LSP

- Status: Accepted (amended 2026-10-13 — separate git repos; amended 2026-10-20 — LSP extraction deferred-with-trigger)
- Date: 2026-10-13

## Context

ftl-dev ships as a CodeOSS extension ([ADR 0001](0001-codeoss-language-stack.md)). Users also want FreeMarker tooling in **Vim** and **Neovim**. Syntax highlighting is mandatory; IDE features should reuse the existing TypeScript language logic where possible.

A monorepo `vim/` folder plus subtree sync to `ftl-dev.vim` caused mixed git roots and accidental cross-repo pushes. Vim must stay a **lightweight, independently versioned** install target.

The `server/` package already speaks stdio LSP and reuses pure `extension/src` modules (completions, diagnostics, navigation, signature help, Hover including named-param). Keeping “LSP extraction” as an open vision gap implied unfinished work that was mostly scaffold + wire-up. Full **VS Code → LanguageClient** migration is a different, large decision.

## Decision

1. **Syntax (required)** — Lives only in the **[`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim)** repository (`ftdetect`, `syntax`, `indent`, `ftplugin`). Neovim uses the same runtime via `runtimepath`. Optional [`tree-sitter-freemarker/`](../../tree-sitter-freemarker/) remains in **this** (VSIX) repo as a contributor scaffold; it is not required for v1 highlighting and is **not** shipped inside `ftl-dev.vim`.
2. **Language features** — A **stdio language server** under [`server/`](../../server/) imports pure modules from `extension/src`. **Vim/Neovim** clients speak LSP when the user installs and configures `ftl-dev-ls`. The server is **not** part of the `ftl-dev.vim` download and is **not** npm-published.
3. **VS Code remains in-process** — The published VSIX continues to register providers in-process. Migrating VS Code onto `server/` is an **explicit deferred** goal (not “Not started” fake backlog). Reopen only on a listed trigger (below).
4. **Editor-local UX** — Indent, `commentstring`, matchit, light auto-pairs, and `gf`/`includeexpr` live in `ftl-dev.vim` — not in the LSP. Named-param **attribute highlight** may live in Vim syntax (parity with TextMate); completions / diagnostics / Hover docs stay on the LSP path.
5. **Repository split** — Workspace layout is `vsix/` (this git → `DevNathan/ftl-dev`) and `vim/` (separate git → `DevNathan/ftl-dev.vim`). No parent umbrella `.git`. No subtree sync script.
6. **Out of scope for the Vim/Neovim port (initial)** — Comparison-operator presentation (`gte`→`>=` via decorations, [ADR 0003](0003-comparison-operator-presentation.md)).

### Triggers to migrate VS Code onto the language server

Reopen a dedicated plan only if one of:

1. Packaging requires a single shared process (publish `ftl-dev-ls`, or VSIX must stop bundling in-process providers), or  
2. A defect must be fixed once for VS Code and Vim and the server is the agreed single path, or  
3. Server gains rename / workspace symbols / semantic tokens and VS Code switches to LanguageClient under that plan.

Until then: **requirements Gaps must not list “LSP extraction when needed” as an open core item.**

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
- Agents must not edit `../vim` when working in this repo unless the user opens the vim workspace folder explicitly as its own project (or a stream plan explicitly owns `vim/**`).
- Plan **0032c** records the Hover wire-up + named-param syntax SHIP and the CLOSE of fake LSP/vim backlog items.
