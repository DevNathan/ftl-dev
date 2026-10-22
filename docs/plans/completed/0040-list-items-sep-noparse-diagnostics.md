# 0040 — False-positive structure diagnostics on valid FTL

Status: **completed**. Repo: `vsix/` only.

## Problem

`validateFtl` (`extension/src/diagnostics.ts`) reported errors on valid FreeMarker 2.3 constructs, found via the playground fixtures (`tests/fixtures/playground/`):

| Construct | Wrong diagnostic |
|-----------|------------------|
| `<#list seq>…<#items as x>…</#items>…</#list>` | `'#list' classic form requires 'as'` + `Unexpected '</#items>'` |
| `<#sep>, </#sep>` | `Unexpected '</#sep>'` |
| `<#list …>…<#else>…</#list>` | `'#else' without an enclosing '#if'` |
| `<#noparse>…</#noparse>` | `Unexpected '</#noparse>'`; body content validated |
| `<#list 0..<n as i>` | `Unclosed directive tag` + `Unexpected '</#list>'` (`<` of `..<` treated as a tag start) |

## Fix

- `items`, `noparse`, `outputformat` are paired block directives.
- `</#sep>` is accepted (sep may be closed implicitly or explicitly).
- `#else` binds to the nearest enclosing `#if` **or** `#list`; duplicate `#else` is reported for either.
- `#list` without `as` is valid when an `#items` appears directly in it; otherwise reported once at the list (`'#list' without 'as' needs an '#items' inside`).
- Tokens inside a `<#noparse>` / `[#noparse]` body are ignored by structure checks and the unclosed-tag scanner.
- `<` preceded by `..` (exclusive range) no longer ends a tag scan.

## Tests

`extension/src/diagnostics.test.ts`: items/sep/list-else form, list without as/items, duplicate list `#else`, list-else inside if, noparse (angle + square), `..<` with and without space. All playground files validate with no diagnostics. `npm test` green.
