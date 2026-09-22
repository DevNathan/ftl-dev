# ADR 0002: Undeclared identifiers vs data-model variables

- Status: Accepted
- Date: 2026-09-22

## Context

FreeMarker templates often use names injected by the Java host into the **data model** (for example `userService`, `request`, `ctx`). Those names are never `#assign`ed inside the `.ftl` file.

If diagnostics treat “not assigned/imported in this file” as an error, typical application templates fill with false positives.

At the same time we still want strong checks for **grammar / structure** mistakes (`<#list>` shape, dangling `?`, unclosed tags, bad `#elseif`, etc.).

## Decision

Split diagnostics into two layers:

| Layer | Default | Examples |
|-------|---------|----------|
| **A. Syntax / structure** | Always on (error) | Unclosed tags, bad `#list` / `#if` shape, dangling `?`, empty `#elseif`, unmatched `</#…>` |
| **B. Name resolution** | **Off by default**; optional strict mode | “Identifier not assigned/imported in this file” |

For layer B, when enabled:

1. **Known names** = `#assign` / `#local` / `#global` / `#macro` / `#function` / `#list` loop vars / `#import as ns` (+ `ns.*`).
2. **Configured externals** (workspace/user settings), e.g.:
   - `ftl-dev.dataModel`: `["userService", "request", …]`
   - and/or project file `.ftl-data-model.json` listing globals per path/glob.
3. Heuristics alone (e.g. `name.method(`) must not be the only way to silence names — prefer explicit config.

Never require a Java language server to silence host-injected data-model names.

## Consequences

- Default UX stays clean for scripting templates that rely on the Java data model.
- Teams that want “declare everything” turn on `ftl-dev.strictVariables` and maintain a data-model allowlist.
- Plan [0006](../plans/completed/0006-ftl-syntax-diagnostics.md) focuses backlog on **layer A** first; layer B is optional name-resolution.
