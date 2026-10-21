# Documentation index

Canonical language: **English**. Korean siblings: `*.ko.md` (see [index.ko.md](index.ko.md)).

| Area | Path | Purpose |
|------|------|---------|
| Product | [product/](product/) | Goals and capabilities — start with [vision.md](product/vision.md); status: [requirements-status.md](product/requirements-status.md); [Vim/Neovim matrix](product/vim-neovim-matrix.md) |
| Decisions | [decisions/](decisions/) | ADRs — [0001](decisions/0001-codeoss-language-stack.md), [0002](decisions/0002-undeclared-vs-datamodel.md), [0003](decisions/0003-comparison-operator-presentation.md), [0004](decisions/0004-changelog.md), [0005 Vim/Neovim + LSP](decisions/0005-vim-neovim-port.md) |
| Active plans | [plans/active/](plans/active/) | *(none)* |
| Completed plans | [plans/completed/](plans/completed/) | Through [0036 Linked editing keeps the pair while the tag name is empty](plans/completed/0036-linked-editing-empty-name.md) |
| Extension | [../extension/](../extension/) | CodeOSS package (grammar + navigation providers) |
| Vim runtime | [ftl-dev.vim](https://github.com/DevNathan/ftl-dev.vim) | **Separate git** — syntax / indent / ftplugin |
| Language server | [../server/](../server/) | Shared LSP (stdio) for Vim / Neovim / future VS Code |
| Publishing | [publishing.md](publishing.md) | Open VSX + VS Marketplace via GitHub Actions |
| Publishing (LS) | [publishing-language-server.md](publishing-language-server.md) | This repo only; not npm |
| Versioning | [versioning.md](versioning.md) | Extension `package.json` bumps |
| Changelog | [../extension/CHANGELOG.md](../extension/CHANGELOG.md) | Per-version user-facing notes (Keep a Changelog; [ADR 0004](decisions/0004-changelog.md)) |
| Grammar tests | [../tests/grammar/](../tests/grammar/) | `vscode-tmgrammar-test` fixtures |
| UX fixtures | [../tests/fixtures/](../tests/fixtures/) | `sample/`, `navigation/`, `comparison/` for F5 / manual checks |

Root entrypoints: [README.md](../README.md), [AGENTS.md](../AGENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md).
