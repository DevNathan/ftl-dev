# Plan: FTL syntax diagnostics

- Status: completed (phase 1)
- Started: 2026-09-22
- Completed: 2026-09-22

## Goal

Expand FreeMarker **syntax/structure** diagnostics. Layer B (undeclared names) is optional per [ADR 0002](../../decisions/0002-undeclared-vs-datamodel.md).

## Shipped in phase 1

- [x] Dangling `?`, unclosed `${` / `<#--`, unclosed directive tags
- [x] `#if` stack / unexpected close / empty `#elseif` / else without if
- [x] HTML not treated as FTL errors
- [x] Policy documented (ADR 0002)

## Deferred backlog (re-open later if needed)

- `#else` after `#else`; unknown directives; `#list` shape; empty `${}`; unbalanced parens; trailing operators; unclosed strings; import path checks; strictVariables / dataModel allowlist

## Follow-on

→ [0007-apache-reference-completions.md](../completed/0007-apache-reference-completions.md)
