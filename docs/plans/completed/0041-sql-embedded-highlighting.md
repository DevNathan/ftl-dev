# 0041 — SQL highlighting in capture assignments

Status: **completed** (VS Code / Open VSX). Repo: `vsix/` only. Vim parity: not yet.

## Problem

FTL scripts build SQL in capture assignments (`<#assign q>SELECT …</#assign>`) and pass it to a host SQL helper. The body was plain template text: no SQL keywords, strings or bind parameters were highlighted.

## Rules

A capture assignment `<#assign|local|global NAME [in ns]>…</#assign|local|global>` (angle syntax) is SQL when either:

1. **Name rule** — `NAME` starts with `sql` (case-insensitive): `sqlInsert`, `SQL_LIST`, `sql`.
2. **Marker rule** — `<#-- @lang sql -->` (case-insensitive) is directly above the opening tag (blank lines allowed). The marker applies to that one block; if the next token is anything else (including a one-line `<#assign x = …>`) the marker does nothing.

Rejected: guessing from the first body line (`SELECT`/`INSERT`…) — false positives on plain text.

## Grammar (`syntaxes/freemarker.tmLanguage.json`)

- `#sql-embed` is the first top-level pattern (and first in the `text.html.basic` injection).
- Body scope `meta.embedded.block.sql` (mapped to language `sql` via `embeddedLanguages`, so comment toggling uses `--`); outer `meta.embedded.sql-block.freemarker`.
- Body patterns, in order: FTL comment, FTL directive, `${…}`, own SQL single/double-quoted strings (with `${…}` / directives inside, `''` escape) and `/* */` comments that also end at a closing capture tag, `@name` bind parameters (`variable.parameter.bind.sql`, Unicode letters, not after a word char so `user@host` is left alone), then `source.sql`.
- `source.sql` is the editor's built-in SQL grammar; if absent, only the FTL / string / bind parts are colored.

## ftldoc

`<#-- @lang … -->` is not a doc (`parseFtlDoc` → undefined) and is transparent for attachment, so

```ftl
<#-- The insert statement. -->
<#-- @lang sql -->
<#assign query>…</#assign>
```

keeps "The insert statement." as `query`'s doc.

## Not covered

- Square-bracket syntax (`[#assign sql…]`).
- Vim / Neovim syntax.
- Standalone `.sql` files containing FTL.

## Tests

- `tests/grammar/sql-embed.ftl` (name rule, marker rule, marker followed by non-capture, unterminated quote, bind params vs e-mail, FTL inside SQL); grammar test loads a `source.sql` stub (`syntaxes/test-support/source.sql.tmLanguage.json`).
- `extension/src/ftldoc.test.ts`: marker is not a doc; doc above marker attaches (angle + square); non-whitespace above marker blocks the doc.
