# Agents

Short map for AI agents in **ftl-dev** (VSIX / CodeOSS product — this repo is `vsix/` in the workspace). Details live under `docs/`—do not grow this file into an encyclopedia.

## Purpose (one line)

CodeOSS FreeMarker tooling for **FTL as a scripting / application-logic language**, not “HTML generation only.” See [docs/product/vision.md](docs/product/vision.md).

## Sibling repo

| Repo | Role |
|------|------|
| **This repo** (`ftl-dev`) | VS Code / Open VSX extension + optional LSP server |
| [`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim) | **Separate git** — Vim / Neovim runtime only (do not edit it from this tree) |

## Read order

1. This map  
2. [docs/product/vision.md](docs/product/vision.md)  
3. [ARCHITECTURE.md](ARCHITECTURE.md)  
4. [docs/index.md](docs/index.md) → relevant `docs/plans/active/` and `docs/decisions/`

## Doc map

| Path | What |
|------|------|
| [extension/](extension/) | CodeOSS extension (grammar + providers) |
| [server/](server/) | Shared FreeMarker language server (LSP stdio); not required for `ftl-dev.vim` install |
| [tree-sitter-freemarker/](tree-sitter-freemarker/) | Optional Neovim tree-sitter scaffold (contributor-only) |
| [docs/product/](docs/product/) | Why we build this; capabilities; [Vim/Neovim matrix](docs/product/vim-neovim-matrix.md) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the extension is structured |
| [docs/decisions/](docs/decisions/) | Lasting technical choices (ADRs) |
| [docs/plans/active/](docs/plans/active/) | Work in progress |
| [docs/plans/completed/](docs/plans/completed/) | Finished plans |
| [docs/publishing.md](docs/publishing.md) / [docs/versioning.md](docs/versioning.md) | Registry publish on `v*` tags only; bump version + [CHANGELOG](extension/CHANGELOG.md) before every deploy |
| [tests/](tests/) | Fixtures (`fixtures/`) + grammar tests (`grammar/`) |

## Operating principles

- Project knowledge stays **in this repository’s docs**, not only in chat.
- Important tech decisions → `docs/decisions/`.
- In-progress work → `docs/plans/active/`; when done → move to `docs/plans/completed/`.
- Prefer updating an existing plan/ADR over scattering notes.
- Do not invent architecture beyond what docs record; propose a decision doc when a choice must stick.
- **Never** add Vim runtime files here; never sync/subtree into `ftl-dev.vim` from this repo.

## Language

- Canonical docs: **English**.
- Korean: optional `*.ko.md` siblings.
- Chat may be Korean; lasting docs default to English unless asked for KO.

## Constraints

- Align changes with an active plan when one exists.
- Keep `AGENTS.md` short; put depth in `docs/`.
