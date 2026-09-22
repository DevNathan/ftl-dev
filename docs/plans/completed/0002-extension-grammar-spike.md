# Plan: Extension grammar spike + test harness

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22

## Goal

Ship CodeOSS extension layer 1 (TextMate + language config) and a dual test harness: F5 Extension Host + `vscode-tmgrammar-test`.

## Done when

- [x] `extension/` scaffolds and activates for `.ftl`
- [x] Grammar v0: directives (`<#…>` / `[#…]`), `${…}`, strings, comments, basic `ident.ident`
- [x] Language config: FTL-aware indent (do not deepen `#elseif` / `#else` vs `#if`)
- [x] `tests/fixtures/sample/` for F5
- [x] `tests/grammar/` + `npm run test:grammar`
- [x] Docs point at `extension/` and the test workflow
- [x] Built-ins (`?c`, …) highlighting; FreeMarker file icon

## Out of scope (deferred)

LSP, go-to, completions, semantic tokens, Marketplace publish → [0003](../active/0003-navigation-providers.md).

## Notes

- Launch: repo root or `extension/` F5; symlink install under `~/.cursor/extensions` for in-window use.
