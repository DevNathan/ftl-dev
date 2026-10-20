# 0032c - LSP + vim gap closure (honest SHIP / CLOSE)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/server/**`, `vsix/docs/decisions/**`, this plan; `vim/**` thin syntax only.  
**Do not edit** `vsix/extension/src/**` (streams A/B).

Related: [ADR 0005](../../decisions/0005-vim-neovim-port.md), [vim-neovim-matrix](../../product/vim-neovim-matrix.md), [0024](0024-directive-named-params.md), [0026](0026-directive-param-aliases-values.md), [0027](0027-directive-param-docs-diagnostics.md), [0030](0030-directive-param-hover.md), [0032a](0032a-directive-leftovers.md), [0032b](0032b-sighelp-datamodel.md), [requirements-status](../../product/requirements-status.md).

---

## Goal

Close the fake / vague Gaps bullets for **LSP extraction** and **vim port of 0024/0026/0027/0030** with either a thin shippable advance or an explicit CLOSE (deferred-with-trigger / not a vsix blocker).

---

## Inventory (verified)

| Area | State |
|------|--------|
| [`server/src/server.ts`](../../../server/src/server.ts) | Already wires completion, diagnostics, definition, references, outline, signature help, document links; Hover was **symbol-only** (missed builtin / directive / named-param from extension providers) |
| VS Code | In-process providers in `extension/src` — **not** LanguageClient → `server/` |
| [`vim/syntax/freemarker.vim`](../../../../vim/syntax/freemarker.vim) | Directive / builtin / method highlight; **no** named-param attribute highlight (TextMate `#directive-named-param` gap) — **shipped** `ftlNamedParam` |
| 0026/0027/0030 semantics | Completions docs, unknown-param diagnostics, Hover-on-param — require TS language logic → **LSP**, not Vimscript copies |

---

## Decisions

| Gap | Verdict | Rationale |
|-----|---------|-----------|
| **LSP extraction** | **SHIP** (thin) + **CLOSE** (backlog wording) | Scaffold + multi-provider wiring already exist. SHIP: wire Hover end-to-end to match VS Code order (`builtin` → `directive` → `namedParam` → symbol) using pure `extension/src` modules. CLOSE: do **not** keep “LSP extraction when needed” as an open vision gap — VS Code stays in-process until an explicit trigger (see ADR 0005 amend). |
| **vim port 0024 highlight** | **SHIP** (thin) | Additive `ftlNamedParam` syn match (snake ∪ camel, `=` not `==`) + vader + coverage ids. |
| **vim port 0026/0027/0030** | **CLOSE** | Completions / diagnostics / Hover are **not** vsix blockers; tracked for Vim users via optional `ftl-dev-ls` + `ftl-dev.vim` (separate git). No TS→Vimscript port. |

### Triggers to reopen full LSP / VS Code migration

Reopen only if one of:

1. Packaging need for a single shared process (e.g. publish `ftl-dev-ls`, or VS Code must drop in-process providers), or  
2. A bug must be fixed once for both VS Code and Vim and the server is the agreed single path, or  
3. Rename / workspace-symbol / semantic tokens are added to `server/` and VS Code is switched to LanguageClient by a dedicated plan.

Until then: **server = contributor + Vim/Neovim LSP clients**; **VS Code = in-process**.

---

## Acceptance criteria

**LSP**

- [x] **AC1:** `server` `onHover` tries `builtinAt` → `directiveAt` → `namedParamAt` → symbol defs (same order as `FtlHoverProvider`).
- [x] **AC2:** `tsconfig` include lists `directiveParams` / `namedParamLhs` / `scan` (named-param Hover deps).
- [x] **AC3:** `cd vsix/server && npm run compile` exits 0.
- [x] **AC4:** ADR 0005 amended: VS Code migration deferred-with-trigger; extraction not fake backlog.

**vim**

- [x] **AC5:** `<#ftl encoding="UTF-8">` → `encoding` is `ftlNamedParam`.
- [x] **AC6:** camel alias `stripWhitespace=` → `ftlNamedParam`.
- [x] **AC7:** `encoding==` → still `ftlIdentifier` (not named-param).
- [x] **AC8:** Coverage ids `syntax.named_param*` in inventory + vader tags.
- [x] **AC9:** Document CLOSE for 0026/0027/0030 non-syntax features (this plan + requirements note).

---

## Scope paths

- `vsix/server/src/server.ts`, `vsix/server/tsconfig.json`
- `vsix/docs/decisions/0005-vim-neovim-port.md` (amend)
- `vsix/docs/plans/completed/0032c-lsp-vim-gaps.md` (this file)
- `vim/syntax/freemarker.vim`, `vim/test/vader/syntax.vader`, `vim/test/coverage_inventory.json`, `vim/CHANGELOG.md`
- Parent merges Gaps in `requirements-status.md` (문서 step)

**Out of scope:** `vsix/extension/src/**`, TextMate JSON, CHANGELOG Unreleased bulk (parent), full VS Code→LSP migration, vim completion omnifunc, copying TS into vim.

---

## Wave one-liner

**Wire LSP Hover to VS Code probe order (incl. named-param); highlight named-param LHS in vim syntax; close “LSP extraction” and non-syntax vim ports as deferred / separate-repo — not fake vsix backlog.**
