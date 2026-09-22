# Requirements status (vision vs shipped)

- Date: 2026-09-22
- Against: [vision.md](vision.md), [ADR 0001](../decisions/0001-codeoss-language-stack.md), [ADR 0002](../decisions/0002-undeclared-vs-datamodel.md)
- Extension: `0.0.11` — plans **0001–0011** completed (Wave 1 IDE parity); `docs/plans/active/` empty
- Verification: `cd extension && npm test` (grammar + unit) passing

## Verdict

**Vision core + Wave 1 IDE polish are shipped** (semantic tokens, outline, references, diagnostics phase 2). Still not full C/Java-class: no Rename, no LSP, no Java bean enrichment, layer B undeclared names deferred.

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
| Diagnostics layer A | **Done** (phase 1–2) | empty `${}`, duplicate else, unknown directive, `#list`/`as`, … |
| Undeclared / data-model (B) | **Deferred** | ADR 0002 |
| Rename / workspace symbols | **Not started** | — |
| LSP / Java enrichment | **Not started / non-goal** | — |

## Gaps / next candidates

1. **RenameProvider** (builds on references)
2. **Workspace Symbol** search
3. Optional **`strictVariables`** (ADR 0002)
4. **LSP** extraction when needed
