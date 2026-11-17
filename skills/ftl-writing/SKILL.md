---
name: ftl-writing
description: Write, refactor, and review Apache FreeMarker (FTL) templates and scripts in .ftl, .ftlh, or .ftlx files. Use for expression syntax, string slicing, sequence and hash operations, macros, functions, and splitting templates into files. File and symbol documentation belong to a separate ftldoc skill.
---

# Write FreeMarker

## Start with the project

- Read the surrounding templates and the caller or data model. Check the FreeMarker dependency version and the host's `incompatible_improvements` setting separately. Match the existing tag syntax, built-in naming convention, output format, and template loader paths.
- Keep the output and data model contract when refactoring. Prefer syntax the project's minimum version can run. When the version is unknown, avoid introducing version-gated features casually and call out the assumption if the result depends on one.

## Choose the expression that fits the job

- Use zero-based brackets for positions and slices. Replace deprecated `s?substring(from, to)` with `s[from..<to]` on FreeMarker 2.3.21+, and `s?substring(from)` with `s[from..]`. Keep the end exclusive. Use `s[from..*length]` when the input may end before the requested length. This does not make an invalid start index valid.
- Use `?keep_before` or `?keep_after` when a delimiter defines the cut, and check what should happen if it is missing. Use `?starts_with`, `?ends_with`, or string `?contains` for the corresponding string tests.
- Avoid introducing `?seq_contains` in loops. Declare a hash once outside the loop and check `allowed[key]??`, or use a delimiter-bounded `?contains` when the input is already a fixed list of simple string tokens with a guaranteed delimiter. For large or dynamic data, prefer a hash or boolean supplied by the host. Avoid building a hash with repeated `+` in a loop.
- Reserve `?seq_contains` for a direct lookup in a short dynamic sequence when the input and FreeMarker's scalar equality semantics need to stay as they are. A hash uses exact string keys. Delimited search also requires validating that the query is a single nonempty token. Below `incompatible_improvements` 2.3.33, string comparisons use locale collation. Chaining `==` or using `?switch` does not avoid that cost.
- Use `<#list items as item>` with `<#else>` for an empty state and `<#sep>` for separators. Use `?filter` or `?map` (2.3.29+) for a short, readable transform. Give intermediate values a name when the transform mixes selection, formatting, or fallback rules.

## Make missing values and types explicit

- Use `(account.displayName)!"Guest"` when any part of the access may be missing, and `(account.displayName)??` to test for presence. Choose a default of the intended type. Presence is different from content or truth.
- Parenthesize a compound default, as in `count!(base + extra)`, and parenthesize a defaulted expression used as an argument when the next argument could be parsed as part of the default.
- Use `gt` and `gte` in angle-bracket directive conditions, or put symbolic comparisons in parentheses. Use FreeMarker's boolean operators and `#if` for branches with multiple steps. A JavaScript ternary, optional chaining, or array methods are not FTL syntax.
- Preserve the output format and auto-escaping. For strings, numbers, and booleans, choose explicit conversions where output is machine read. Avoid disabling escaping to fix a formatting problem.

## Decide where the code belongs

- Keep a short expression at its use. Name repeated calculations and extract a function when the calculation has a meaningful input/output contract. Use `#function` with `#return value` for values, `#macro` for rendered output, and `#local` for temporary variables inside both. `#assign` writes to the namespace even inside a macro or function.
- Group reusable helpers by what they do. Put related macros or functions in one file and use `<#import "lib/rows.ftlh" as rows>`, then call `<@rows.render items=items />` or `rows.displayLabel(item)`. Pass the data explicitly so a caller can tell what the helper needs.
- Use `#include` to render a fragment at that spot in the caller's namespace. Use `#import` for a library with a namespace. Keep imports near the top, after any `#ftl` header, and check that the paths resolve through the project's template loader.
- Split files when code is reused, has a clear separate responsibility, or makes the caller hard to read. Keep one-off markup near its surrounding layout. Keep expensive lookups, I/O, and business rules in the host when the project allows it.

Use the project's FreeMarker version to render a representative case and relevant boundaries, such as missing data, empty sequences, and slice endpoints. Compare the rendered output when refactoring. For examples and compatibility details, read [FTL patterns](references/patterns.md).
