# Requirements status (vision vs shipped)

- Date: 2026-10-15
- Against: [vision.md](vision.md), [ADR 0001](../decisions/0001-codeoss-language-stack.md), [ADR 0002](../decisions/0002-undeclared-vs-datamodel.md), [ADR 0003](../decisions/0003-comparison-operator-presentation.md)
- Extension: `0.0.15` — plans **0001–0014** completed (**0015** planned only, not implemented); Signature Help; nested FTL comments (incl. comments inside directives / hash literals — plan 0014); Vim plugin tree + docs ([matrix](vim-neovim-matrix.md)); comparison presentation opt-in (default off; not in Vim port)
- Verification: `cd extension && npm test` (grammar + unit) passing

## Verdict

**Vision core + Wave 1 IDE polish are shipped** (semantic tokens, outline, references, diagnostics phase 2). Comparison operator presentation (`gte`→`>=`) adds IntelliJ/MyBatis-style display. Still not full C/Java-class: no Rename, no LSP, no Java bean enrichment, layer B undeclared names deferred.

| Vision / ADR item | Status | Evidence |
|-------------------|--------|----------|
| Lexical highlighting | **Done** | TextMate + `tests/grammar/` |
| Semantic tokens | **Done** | `semanticTokens.ts` + provider in `extension.ts` |
| Go to definition | **Done** | `FtlDefinitionProvider` |
| Document outline | **Done** | `FtlDocumentSymbolProvider` |
| Find all references | **Done** | `FtlReferenceProvider` (same-file + `ns.sym`) |
| Import / include paths | **Done** | DocumentLink + definition |
| Completions + Apache docs | **Done** | catalog + `freemarkerRef.ts` |
| Directive auto-close / FTL indent | **Done** | closeTag + indentRules |
| Diagnostics layer A | **Done** (phase 1–2+) | empty `${}`, duplicate else, unknown directive, `#list`/`as`, hash-literal commas (comments ignored), comment delimiters, … |
| Comparison op presentation | **Done** (opt-in) | decorations + `comparisonDisplay.ts` (ADR 0003); default **off** (minimap) |
| Signature Help (`#function` / `#macro`) | **Done** | `signatureHelp.ts` + provider; not builtins |
| Nested FTL comments + delimiter diagnostics | **Done** | TextMate `comment.block` (also inside directives/`${}`; plan 0014) + `comments.ts` / diagnostics |
| Vim / Neovim syntax + shared LSP scaffold | **Done** (scaffold) | [`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim) (separate git), [`server/`](../../server/), ADR 0005 |
| Undeclared / data-model (B) | **Deferred** | ADR 0002 |
| Rename / workspace symbols | **Not started** | — |
| LSP / Java enrichment | **Not started / non-goal** | — |

## Gaps / next candidates

1. **RenameProvider** (builds on references)
2. **Workspace Symbol** search
3. Optional **`strictVariables`** (ADR 0002)
4. Builtin / `?built_in(…)` signature help
5. **LSP** extraction when needed
