# ADR 0003: Comparison operator presentation via decorations

- Status: Accepted
- Date: 2026-09-23

## Context

In angle-bracket FreeMarker, authors often write `lt` / `lte` / `gt` / `gte` instead of `<` / `<=` / `>` / `>=` so `>` does not close the tag. IntelliJ (and MyBatis mapper entity folding) can show the symbolic form in the editor while keeping the alphabetic token in the file.

CodeOSS / VS Code has no public API equivalent to IntelliJ’s `FoldingBuilder` with custom placeholder text.

## Decision

Use **text editor decorations** for presentation:

1. Hide the source token (`opacity: 0` + strong negative `letterSpacing`).
2. Inject the symbolic form with `after.contentText`.
3. When the caret or a selection intersects the token range, omit that decoration so the real `gte` (etc.) is visible for editing.
4. Toggle with `ftl-dev.comparisonOperatorPresentation` (default `true`).

Scan only FTL expression regions (`${…}`, interiors of `<#…>` / `[#…]` open tags). Never restyle the whitespace directive `<#lt>` / `[#lt]` (token immediately after `#`).

Do **not** invent an LSP fold protocol for this; keep the feature in the extension host until a shared language service needs it.

## Consequences

- UX approximates IntelliJ “click to reveal” via caret/selection, not true fold expand/collapse.
- Decoration are a known workaround (layout/accessibility quirks possible); acceptable for v1.
- Pure finder logic stays unit-testable without the VS Code UI.
