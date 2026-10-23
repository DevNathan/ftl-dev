# Playground fixtures

Hand-check files for the Extension Host (Run and Debug → **Run Extension**, which opens `tests/fixtures`). Each file starts with a comment saying what to look at and any known diagnostic gaps. With default settings every file except `switch-checks.ftl` should show no diagnostics.

| File | What to check |
|------|---------------|
| [`strings.ftl`](strings.ftl) | Plan 0039: text in string color, escapes highlighted; `${` / `}` inside strings in the embedded-punctuation color with the body as code (nested `'test'` stays string-colored; a same-quote `"${cfg.env["test"]}"` is highlighted the same way); raw `r"…"` / `r'…'` plain string with no escape or `${…}` highlight; hash keys like `"header"` stay string-colored while the `header` value is a variable; "header" in plain HTML text is not a variable. |
| [`directives.ftl`](directives.ftl) | Directive keywords and named params in angle syntax; `#list`/`#items`/`#sep`/`#else`, `#switch`, `#attempt`, `#compress`; `#import … as lib` namespace color; the `<#noparse>` body stays unhighlighted by semantic tokens. The `#include` target is intentionally missing (`ignore_missing=true`). |
| [`macros-functions.ftl`](macros-functions.ftl) | Macro / function colors, defaults and varargs, nested loop variables, ftldoc tags in comments, Hover and Signature Help on `button`, `price`, `lib.card`. |
| [`expressions.ftl`](expressions.ftl) | Numbers, booleans, operators (`gt`, `lte`, `>` in parentheses), `??` and `!` defaults, ranges (`1..3`, `0..<n`, `2..*3`), literals, builtin chains, lambdas, legacy `#{…}`. |
| [`html-mix.ftl`](html-mix.ftl) | `${…}` in HTML attributes, `<#if>` inside attribute lists, FTL in `<script>` / `<style>`, FTL comment (muted) vs HTML comment. |
| [`square-syntax.ftl`](square-syntax.ftl) | The same directives in `[#…]` / `[@…]` syntax and `[#-- --]` comments (FreeMarker uses one tag syntax per file). |
| [`lib.ftl`](lib.ftl) | Imported library (`lib`) used by the other files. |
| [`switch-checks.ftl`](switch-checks.ftl) | `#switch` checks: fall-through warning on a non-empty `#case` without `#break` (grouping, `#return`/`#stop` and a `falls through` comment are fine) and an error for mixing `#on` with `#case`. Diagnostics here are intended. |
