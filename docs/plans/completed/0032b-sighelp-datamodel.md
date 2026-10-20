# 0032b - Builtin Signature Help expand + data-model path/templates

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.  
Stream: **B** (parallel). Parent consolidates CHANGELOG / requirements-status.

Related: [0028](0028-builtin-signature-help.md), [0031](0031-ftl-data-model-json.md), [ADR 0002](../../decisions/0002-undeclared-vs-datamodel.md), [0032a](0032a-directive-leftovers.md), [0032c](0032c-lsp-vim-gaps.md), [requirements-status](../../product/requirements-status.md).

---

## Goal

1. **Signature Help:** Expand the builtin param catalog beyond plan **0028**’s practical subset so most **arg-taking** names in `catalogLists.BUILTINS` get Signature Help (still paraphrased labels — not a Java/Apache overload dump). Resolve camelCase aliases (`?endsWith(` → same params as `ends_with`).
2. **Data-model path MVP:** Thin optional `templates` map on `.ftl-data-model.json` so allowlist roots can be scoped by path prefix / simple glob (ADR 0002 stretch remainder). Keep workspace-wide `roots` unchanged.

---

## Non-goals

- Full FreeMarker overload sets / every expert builtin not in `BUILTINS`
- Nested walk-up `.ftl-data-model.json`, full micromatch/gitignore glob engines
- vim/, LSP, CHANGELOG / requirements-status / package.json version (parent)
- Touching stream A/C ownership files (`directiveParams*`, `namedParam*`, `hoverAtCursor*`, …)

---

## Signature Help — inventory

**Keep / refine** all 0028 entries. **Add** clearly arg-taking gaps still in `BUILTINS`:

| Builtin | Labels (paraphrase) |
|---------|---------------------|
| `new` | `constructorArg…` |
| `number` | `format?` (string→number optional pattern) |

**Refine** (still one primary shape):

| Builtin | Labels |
|---------|--------|
| `string` | `formatOrWhenTrue?`, `whenFalse?` |
| `truncate` | `maxLength`, `terminator?`, `terminatorLength?` |
| `ensure_starts_with` | `prefixOrPattern`, `prefixIfMissing?`, `flags?` |

**CamelCase:** `builtinSignatureOf("endsWith")` resolves to the `ends_with` entry (and likewise for other underscored catalog names). Zero-arg / uncataloged names stay silent.

**Explicitly still omitted** (no/paren-less primary use): `eval`, `interpret`, `size`, `trim`, `is_*`, casts, etc.

---

## Data-model — schema MVP

```json
{
  "roots": ["userService", "request"],
  "templates": {
    "views/": ["viewModel"],
    "admin/**": ["adminCtx"],
    "mail/order.ftl": ["orderMail"]
  }
}
```

| Rule | Detail |
|------|--------|
| `roots` | Unchanged — workspace-folder-wide allowlist contribution |
| `templates` | Optional object; keys = path **prefix** or simple glob (`*`, `**`); values = string arrays of root names |
| Paths | Relative to the **workspace folder**, `/`-normalized; match against the open `.ftl` path relative to that folder |
| Missing `templates` | `{}` — same as 0031 |
| Invalid `templates` | Same as bad `roots`: empty file contribution + warn (no crash) |
| Merge | settings ∪ file `roots` ∪ matching `templates` entries (set-union; order irrelevant) |

**Matching (thin):**

1. Normalize both sides to `/`.
2. If pattern has no `*` → **prefix** match (`views/` matches `views/a.ftl`; bare `mail/order.ftl` matches that file).
3. If pattern has `*` / `**` → convert to a anchored RegExp (`*` = one segment chars except `/`; `**` = any path).

No full glob feature matrix — document limits in ACs.

---

## Acceptance criteria

**Signature Help**

- [x] **AC1:** Catalog includes `new` and `number` with ≥1 param label each; `?new(` / `?number(` yield Signature Help.
- [x] **AC2:** `string` / `truncate` / `ensure_starts_with` labels match the refine table (min param counts: string≥1, truncate≥2, ensure_starts_with≥1).
- [x] **AC3:** `?endsWith(` (camel) yields same param labels as `ends_with`.
- [x] **AC4:** Uncataloged / zero-arg (`?size(`, `?trim(`) still undefined.
- [x] **AC5:** Prior 0028 replace / then / join cases still pass.

**Data-model templates**

- [x] **AC6:** `{ "roots": ["g"], "templates": { "views/": ["v"] } }` parses; `rootsForTemplatePath(…, "views/x.ftl")` includes `g` and `v`.
- [x] **AC7:** Same model, path `other/x.ftl` → `g` only (no `v`).
- [x] **AC8:** Glob key `admin/**` matches `admin/a/b.ftl`; does not match `x/admin/a.ftl` unless pattern says so.
- [x] **AC9:** Invalid `templates` (non-object / non-string-array values) → parse error path (empty contribution + warn via `loadFileRootsFromRead` / load helpers).
- [x] **AC10:** Missing `templates` → behavior identical to 0031 flat `roots` only.
- [x] **AC11:** Provider merge uses path-scoped file roots for the open document (logic in `dataModelFile.ts`; provider only passes relative path).

**Verification**

- [x] **AC12:** Unit tests for AC1–AC11.
- [x] **AC13:** `cd vsix/extension && npm test` exit 0 (or failures only from foreign stream files, noted).

---

## Scope paths

- `extension/src/builtinSignatures.ts`
- `extension/src/signatureHelp.ts` — only if expand needs a hook (prefer catalog-only)
- `extension/src/signatureHelp.test.ts`
- `extension/src/dataModelFile.ts`
- `extension/src/dataModelFile.test.ts`
- `extension/src/diagnosticsProvider.ts` — data-model load/merge lines only
- This plan

---

## Wave one-liner

**Expand builtin Signature Help (arg-taking coverage + camelCase) and ship thin `.ftl-data-model.json` `templates` path/prefix allowlists.**
