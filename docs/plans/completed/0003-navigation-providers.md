# Plan: In-editor navigation providers

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22

## Goal

Add CodeOSS **Definition** and **DocumentLink** providers (in-process) so macros, functions, assigns, and include/import paths are navigable.

## Done when

- [x] Symbol index for `#assign` / `#macro` / `#function` (angle + square)
- [x] `DefinitionProvider`: same-file go-to
- [x] Cross-file import/include DocumentLink + `ns.symbol` definition (best-effort)
- [x] Fixtures under `tests/fixtures/navigation/`
- [x] Unit tests + docs
- [x] Follow-ups during this sprint: `<@` / HTML bracket false-errors fixed; built-in directive keyword highlighting

## Follow-on

→ [0004-completions.md](../active/0004-completions.md)
