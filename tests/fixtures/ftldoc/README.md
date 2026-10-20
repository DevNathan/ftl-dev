# ftldoc fixture

Manual check for JavaDoc-like FTL comments ([0016-ftldoc](../../docs/plans/completed/0016-ftldoc.md)).

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

Supported tags today: `@param`, `@return`/`@returns`, `@deprecated`, `@nodoc`, `@see`, `@since`, `@stop`.  
Not implemented (JavaDoc leftovers): `@throws`/`@exception`, `@author`, `@version`, `@serial`, … — use `@stop` instead of `@throws`.
