# Plan: Semantic tokens

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22
- Agent task: A

## Goal

Provide `DocumentSemanticTokensProvider` so resolvable FTL names get richer coloring than TextMate alone (macros/functions/assigns/imports).

## Done when

- [x] Token legend: at least `function`, `macro` (or method), `variable`, `namespace` (or similar VS Code types)
- [x] Tokens for declarations and known uses in-file; `ns.sym` when import-resolvable (best-effort)
- [x] Unit tests for token ranges on a small fixture string
- [x] Module ready for master to `registerDocumentSemanticTokensProvider`

## Legend (Agent A)

`FTL_SEMANTIC_TOKEN_TYPES`: `function`, `variable`, `namespace`, `method`

| FTL | Legend type |
|-----|-------------|
| `#function` name / use | `function` |
| `#macro` name / use | `method` |
| `#assign` / `#local` / `#global` | `variable` |
| `#import … as ns` / `ns` uses | `namespace` |
| `ns.member` (resolved import) | `namespace` + member kind |

Pure API in `extension/src/semanticTokens.ts` (no `vscode` import so node tests work). Registration sketch is in the module file header; master wires `extension.ts`.

## Out of scope

Java property resolution; full workspace index.
