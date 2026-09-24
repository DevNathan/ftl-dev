# Documentation index

Canonical language: **English**. Korean siblings: `*.ko.md` (see [index.ko.md](index.ko.md)).

| Area | Path | Purpose |
|------|------|---------|
| Product | [product/](product/) | Goals and capabilities — start with [vision.md](product/vision.md); status: [requirements-status.md](product/requirements-status.md) |
| Decisions | [decisions/](decisions/) | ADRs — [0001](decisions/0001-codeoss-language-stack.md), [0002 undeclared vs data model](decisions/0002-undeclared-vs-datamodel.md), [0003 comparison op presentation](decisions/0003-comparison-operator-presentation.md), [0004 changelog](decisions/0004-changelog.md) |
| Active plans | [plans/active/](plans/active/) | *(none)* |
| Completed plans | [plans/completed/](plans/completed/) | Through [0012 comparison operator presentation](plans/completed/0012-comparison-operator-presentation.md) |
| Extension | [../extension/](../extension/) | CodeOSS package (grammar + navigation providers) |
| Publishing | [publishing.md](publishing.md) | Open VSX + VS Marketplace via GitHub Actions |
| Versioning | [versioning.md](versioning.md) | When/how to bump `package.json` version before publish |
| Changelog | [../extension/CHANGELOG.md](../extension/CHANGELOG.md) | Per-version user-facing notes (Keep a Changelog; [ADR 0004](decisions/0004-changelog.md)) |
| Grammar tests | [../tests/grammar/](../tests/grammar/) | `vscode-tmgrammar-test` fixtures |
| UX fixtures | [../tests/fixtures/](../tests/fixtures/) | `sample/`, `navigation/`, `comparison/` for F5 / manual checks |

Root entrypoints: [README.md](../README.md), [AGENTS.md](../AGENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md).
