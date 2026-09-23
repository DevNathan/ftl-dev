# Plan: Comparison operator presentation

- Status: completed
- Started: 2026-09-23
- Completed: 2026-09-23
- ADR: [0003-comparison-operator-presentation.md](../../decisions/0003-comparison-operator-presentation.md)

## Goal

Present FreeMarker alphabetic relational operators (`lt` / `lte` / `gt` / `gte`) as `<` / `<=` / `>` / `>=` in the editor (MyBatis-mapper-style), without changing file text. Caret/selection on a token reveals the source.

## Done when

- [x] Pure scanner `findComparisonOps` (expr contexts; skip `#lt`, strings, comments)
- [x] Decoration provider + setting `ftl-dev.comparisonOperatorPresentation`
- [x] Unit tests + `test:unit` wiring
- [x] F5 fixture `tests/fixtures/comparison/ops.ftl`
- [x] ADR + ARCHITECTURE + requirements-status + index

## Out of scope

`eq` / `neq`, deprecated `\lt` forms, real IntelliJ folding API (unavailable in CodeOSS).
