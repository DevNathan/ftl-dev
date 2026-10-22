# ftldoc fixture

Manual check for JavaDoc-like FTL comments ([0016-ftldoc](../../../docs/plans/completed/0016-ftldoc.md); Javadoc / JSDoc parity: [0038](../../../docs/plans/completed/0038-ftldoc-javadoc-parity.md)).

## How

1. Run and Debug → **Run Extension (ftldoc fixture)** (or F5 on **Run Extension (ftl-dev vsix)** then open `ftldoc/demo.ftl`).
2. In the Extension Host window, open [`demo.ftl`](demo.ftl) from the explorer.
3. Hover (or **Ctrl+K Ctrl+I**) on the identifiers below.

Note: older launch configs only opened `fixtures/navigation`, so `demo.ftl` did not appear until you browsed elsewhere.

## Checklist

| Target | Expected Hover |
|--------|----------------|
| `say` | summary + **Parameters** / **Returns** / **Since** / **See** |
| `banner` | summary + lists + **Parameters** / **See** / **Since** / **Deprecated** |
| `require` | **Stop** (for `#stop`) + **See** |
| `title` | “Site title…” |
| `r` | `` `r` — assign `` only — **no** `@nodoc` body |
| `legacy` | **Deprecated** + yellow squiggle on use |
| `tmp` inside `scopedDemo` body | “Accumulator…” |
| `tmp` outside (bottom of file) | no local doc / no false local resolve |
| `parseRequest` | two summary lines (hard break), both **Parameters** descriptions (`header` on two lines), **Returns** fenced `{ … }` block, `**@processing**` ordered list, **Note** |
| `parseRequest("p", \|` (Signature Help) | summary + Returns; active parameter shows its description |
| Ctrl+Space on `parseRequest` | completion item documentation = the Hover Markdown |
| `missing` in the `strayParam` comment | blue Information squiggle; `ftl-dev.ftldoc.validateParams: false` clears it without editing, `true` restores it |
| LSP (`server/out/server/src/cli.js --stdio`) hover on `parseRequest` | same Markdown as VS Code Hover |

Supported tags (plan 0038): block tags span every following line up to the next line-start `@tag`, and a description may start on the next line.

- Known: `@param` (`{type}`, `[name]`, `[name=default]`, dotted `opts.key`), `@return`/`@returns` (`{type}`; multi-line `{ … }` shape → code block), `@deprecated`, `@see`, `@since`, `@stop`, `@example` (fenced `ftl`), `@note`, `@remarks`, `@todo`, `@author`, `@version`; `@nodoc` (leading) suppresses the doc.
- Any other tag (e.g. `@processing`, `@throws`, `@ignore`) renders as a `**@tag**` section in source order.
- Inline: `{@link t}`, `{@link t label}`, `{@linkplain …}`, `{@linkcode x}`, `{@code x}`, `{@literal x}`.
- Line breaks are kept (hard breaks); a line-start `@word` inside a body always starts a new tag (use `{@literal @word}` for a literal one).
