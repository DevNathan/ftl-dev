# Plan: Diagnostics phase 2

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22
- Agent task: C
- Continues: [completed/0006-ftl-syntax-diagnostics.md](../completed/0006-ftl-syntax-diagnostics.md) backlog

## Goal

Expand layer-A syntax/structure diagnostics without enabling undeclared-name (layer B / ADR 0002).

## Done when (pick high-value subset)

- [x] Empty interpolation `${}`
- [x] `#else` after `#else` (duplicate else)
- [x] Unknown `#directive` name (vs catalog `DIRECTIVES`)
- [x] `#list` missing `as` (classic form) — best-effort
- [x] Unit tests for each new rule
- [x] No false positives on `tests/fixtures/navigation/main.ftl` sample shapes

## Out of scope

`strictVariables` / data-model allowlist; import path filesystem checks (unless trivial).
