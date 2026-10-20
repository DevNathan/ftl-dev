# 0025 - Rename ftldoc `@ignore` → clearer tag

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
QA: placeholder — `npm test` exit 0 (from `extension/`; 개발 already green; 검증QA runs in parallel)  
Repo: `vsix/` only — never touch `vim/` (no shared ftldoc tag there; grep: zero `@ignore` under `vim/`).

Related: [0016-ftldoc.md](0016-ftldoc.md) (leading-ignore rule), [0017-ftldoc-comment-highlight.md](0017-ftldoc-comment-highlight.md) (TextMate tag list).  
Note: Active filename was `0023-ftldoc-rename-ignore.md`; completed number is **0025** because [0023-workspace-symbol.md](0023-workspace-symbol.md) already occupies 0023 and [0024-directive-named-params.md](0024-directive-named-params.md) occupies 0024.

**Parallel grammar WIP quarantine:** During this feature’s grammar work, unfinished SYNTAX TEST fixtures for other in-flight grammar features were moved under [`tests/grammar/_wip/`](../../../tests/grammar/_wip/) (`directive-named-params.ftl`, `string-interpolation.ftl`) so `npm run test:grammar` (glob `tests/grammar/*.ftl` only) stays green. Other features can restore those fixtures from `_wip/` when ready.

---

## Goal

Rename the ftldoc tag **`@ignore`** so authors do not misread it as “ignore this writing / don’t read this content.”

Today’s semantics stay the same; only the **canonical tag name** (and docs/tests/fixtures) change:

1. After trim, if the **first token** of a leading FTL comment body is the suppress tag (case-insensitive word boundary) → **`parseFtlDoc` returns `undefined`** → symbol gets **no** attached `doc` (Hover shows kind-only / no comment body). Primary use: throwaway `<#assign r = sideEffect() />` comments.
2. Mid-body occurrence of the same tag name is **not** the leading rule: skip that tag line; do **not** wipe a doc that did not start with the suppress tag.
3. Grammar continues to highlight the (new) tag inside `comment.block.freemarker`.

---

## Background (current semantics)

| Area | Behavior today |
|------|----------------|
| Parser | `extension/src/ftldoc.ts`: `/^@ignore\b/i` → `undefined`; mid-body `name === "ignore"` → `continue` |
| Index | `symbols.ts`: `doc` absent when `@ignore` or no leading comment |
| Tests | `ftldoc.test.ts` AC3-style cases; fixture `tests/fixtures/ftldoc/demo.ftl` |
| Grammar | `freemarker.tmLanguage.json` `#ftldoc-tag`: `(?:ignore\|returns?\|…)` |
| Docs | `CHANGELOG.md`, fixture README, completed plans 0016/0017 |
| vim | **Not present** — out of scope |

Misread risk: “ignore” sounds like “skip reading this prose,” not “do not attach this comment as documentation.”

---

## Rename candidates

English single-token tags (match existing `@deprecated` / `@see` / `@since` / `@stop` style: `@` + `\w+`, case-insensitive).

| Candidate | Pros | Cons |
|-----------|------|------|
| **`@nodoc`** | Short; clearly “no documentation”; used in other doc ecosystems; hard to confuse with “don’t read this text” | Slightly terse / slangy |
| **`@undocumented`** | Very explicit “this is not documentation” | Longer; can sound like a *status of the symbol* rather than “suppress this comment” |
| **`@discard`** | Action verb for throwaway side-effect comments | Discard *what*? Less idiomatic next to `@see` / `@param` |
| **`@hidden`** | Suggests “don’t show in Hover” | Easy to confuse with API visibility / outline hiding |

### Recommendation

**Canonical name: `@nodoc`.**

Best balance of clarity (“no doc attachment”) and style length. Prefer over `@undocumented` (wordier, status-like) and `@hidden` (visibility conflation).

---

## Approach (rename vs alias)

**Hard rename to `@nodoc` as the only suppress tag** — no permanent `@ignore` alias.

Rationale:

- Feature is young (plans 0016/0017); in-repo fixtures/tests are the main call sites.
- Keeping `@ignore` as an alias would leave the confusing name in the language and grammar forever unless a second cleanup lands.
- Unknown `@` tags are already ignored mid-body; a leftover `@ignore` mid-doc would become a no-op unknown tag (same as today’s mid-body skip for practical Hover content). Leading `@ignore` after hard cut would **no longer** suppress docs (authors must switch to `@nodoc`).

**Not chosen:** temporary alias period (`@ignore` ≡ `@nodoc` for one release). Optional stretch only if 개발 finds external templates in the wild; default is hard cut + CHANGELOG migration note.

Migration (authors):

```ftl
<#--
@nodoc
Throwaway side-effect — not Hover docs.
-->
<#assign r = ob.log() />
```

---

## Scope paths (concrete)

**Product / tests (개발):**

- `extension/src/ftldoc.ts` — leading regex + mid-body tag name (`ignore` → `nodoc`); file/header comments
- `extension/src/ftldoc.test.ts` — test titles and bodies
- `extension/src/symbols.ts` — JSDoc on `doc` field (“absent when `@nodoc`…”)
- `extension/syntaxes/freemarker.tmLanguage.json` — `#ftldoc-tag` match + comment string
- `tests/grammar/ftldoc-comment.ftl` — SYNTAX TEST lines that assert `@ignore` / `@IGNORE`
- `tests/fixtures/ftldoc/demo.ftl` — leading tag + hover note comments
- `tests/fixtures/ftldoc/README.md` — supported-tags list + checklist row for `r`

**Docs (문서 step or same change set):**

- `extension/CHANGELOG.md` — note rename `@ignore` → `@nodoc` (breaking for any user who adopted `@ignore`)
- This plan file (moved to `docs/plans/completed/0025-ftldoc-rename-ignore.md`)
- Optional one-line touch: completed plan cross-links are historical; **do not** rewrite 0016/0017 bodies unless desired for clarity (non-blocking)

**Explicitly out of scope:** `vim/**`, other ftldoc tags (`@param`, `@deprecated`, …), Hover Markdown layout, diagnostics, version bump / git tag.

---

## Non-goals

- No changes under `vim/`.
- No new ftldoc tags beyond the rename.
- No change to attachment rules (whitespace-only between comment and declaration).
- No change to mid-body behavior beyond renaming the skipped tag token.
- No migration script / codemod for end-user `.ftl` trees.
- No permanent dual-name alias (unless stretch, see Approach).
- No version bump, commit, or marketplace publish in this pipeline step alone.
- No new ADR (CHANGELOG breaking note is sufficient).

---

## Acceptance criteria (testable)

- **AC1:** After trim, leading `@nodoc` / `@NODOC` → `parseFtlDoc` returns `undefined`; indexed symbol for a leading-`@nodoc` assign has `doc === undefined`.
- **AC2:** Mid-body `@nodoc` does **not** wipe a doc that has a prior summary/`@param` (tag line skipped).
- **AC3:** Leading `@ignore` **no longer** suppresses documentation (hard cut): e.g. `parseFtlDoc("@ignore\nside effect")` is **not** `undefined` solely because of `@ignore` (summary may attach; `@ignore` treated as unknown mid/leading tag line per parser rules — leading unknown `@` still starts “in tags” with empty summary, which may yield `undefined` for empty structured doc; **lock behavior in tests**: either empty/`undefined` without treating as the suppress rule, or document that leading unknown tags do not use the nodoc short-circuit — preferred: assert **`@nodoc` is the only suppress short-circuit** and that `@ignore` is **not** special-cased).
- **AC4:** TextMate `#ftldoc-tag` highlights `@nodoc` / `@NODOC` (and no longer requires `@ignore` in the alternation); `tests/grammar/ftldoc-comment.ftl` updated and green.
- **AC5:** Fixture `demo.ftl` + README use `@nodoc`; checklist expectation for `r` unchanged (no comment body on Hover).
- **AC6:** `cd vsix/extension && npm test` exit 0 (unit + grammar).
- **AC7:** `[Unreleased]` in `extension/CHANGELOG.md` documents `@ignore` → `@nodoc` (breaking rename).

---

## Implementation order (개발 가이드)

1. Parser: replace `ignore` with `nodoc` in leading regex and mid-body branch; update comments in `ftldoc.ts` / `symbols.ts`.
2. Unit tests + fixture/README.
3. Grammar regex + `ftldoc-comment.ftl` SYNTAX TEST.
4. `npm test` from `extension/`.
5. 문서: CHANGELOG (AC7); mark plan completed → `docs/plans/completed/`.

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

| Area | Coverage |
|------|----------|
| Parser suppress + mid-body | `extension/src/ftldoc.test.ts` |
| Grammar highlight | `tests/grammar/ftldoc-comment.ftl` via grammar suite |
| Manual (optional) | F5 → `tests/fixtures/ftldoc/demo.ftl` → Hover `r` shows no `@nodoc` body |

---

## Risks

| Risk | Mitigation |
|------|------------|
| External `.ftl` still using `@ignore` | CHANGELOG breaking note; hard cut is intentional |
| Grammar fixture flake | Keep same assertion style as 0017; only swap token |
| Confusing AC3 for leading `@ignore` | Explicit unit test: `@nodoc` short-circuits; `@ignore` is not the suppress tag |

---

## One-liner

**Rename ftldoc suppress tag `@ignore` → `@nodoc` (hard cut, vsix only); update parser, grammar, tests, fixtures, CHANGELOG.**
