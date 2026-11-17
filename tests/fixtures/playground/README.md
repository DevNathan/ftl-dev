# Playground fixtures

Open these files in the [Extension Development Host](../../../docs/development.md#try-the-extension-locally). Each file describes what to check near the top. With default settings, only `switch-checks.ftl` and `diagnostic-checks.ftl` should show diagnostics.

| File | What to check |
|------|---------------|
| [`strings.ftl`](strings.ftl) | Plan 0039: text in string color, escapes highlighted; `${` / `}` inside strings in the embedded-punctuation color with the body as code (nested `'test'` stays string-colored; a same-quote `"${cfg.env["test"]}"` is highlighted the same way); raw `r"…"` / `r'…'` plain string with no escape or `${…}` highlight; hash keys like `"header"` stay string-colored while the `header` value is a variable; "header" in plain HTML text is not a variable. |
| [`directives.ftl`](directives.ftl) | Directive keywords and named params in angle syntax; `#list`/`#items`/`#sep`/`#else`, `#switch`, `#attempt`, `#compress`; `#import … as lib` namespace color; the `<#noparse>` body stays unhighlighted by semantic tokens. The `#include` target is intentionally missing (`ignore_missing=true`). |
| [`macros-functions.ftl`](macros-functions.ftl) | Macro / function colors, defaults and varargs, nested loop variables, ftldoc tags in comments, Hover and Signature Help on `button`, `price`, `lib.card`. |
| [`expressions.ftl`](expressions.ftl) | Numbers, booleans, operators (`gt`, `lte`, `>` in parentheses), `??` and `!` defaults, ranges (`1..3`, `0..<n`, `2..*3`), literals, builtin chains, lambdas, legacy `#{…}`. |
| [`html-mix.ftl`](html-mix.ftl) | `${…}` in HTML attributes, `<#if>` inside attribute lists, FTL in `<script>` / `<style>`, FTL comment (muted) vs HTML comment. |
| [`square-syntax.ftl`](square-syntax.ftl) | Compare `[#…]` / `[@…]` delimiters with angle tags in `directives.ftl`. In `[#assign first = items[0]?upper_case]`, only the index brackets should get bracket pair colors. |
| [`scope-and-iteration.ftl`](scope-and-iteration.ftl) | Hash key/value iteration and `#continue`. Hover the import and include paths for the target files' ftldoc. Try Go to Definition on each use of `label`, on `report`, and on the paths. |
| [`output-formats.ftlh`](output-formats.ftlh) | HTML output settings, `?esc` and `?no_esc`, nested auto-escaping blocks, an XML output block and literal text inside `#noparse`. |
| [`sql-captures.ftl`](sql-captures.ftl) | SQL highlighting in a capture named `sqlOrders` and a capture marked with `@lang sql`. Compare keywords, bind parameters and escaped quotes with the plain text capture at the end. |
| [`diagnostic-checks.ftl`](diagnostic-checks.ftl) | Expect three diagnostics: an unknown `#ftl` parameter, a `#list` missing its `#items` block, and an empty interpolation. |
| [`lib.ftl`](lib.ftl) | Imported library (`lib`) used by the other files. |
| [`switch-checks.ftl`](switch-checks.ftl) | `#switch` checks: fall-through warning on a non-empty `#case` without `#break` (grouping, `#return`/`#stop` and a `falls through` comment are fine) and an error for mixing `#on` with `#case`. Diagnostics here are intended. |
