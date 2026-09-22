# Plan: Apache FreeMarker reference in completions

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22

## Goal

Port concise **Apache FreeMarker Manual** descriptions for built-ins (and directives) into the extension so Ctrl+Space shows usage/docs (e.g. `has_content`), and Hover reuses the same text.

Source of truth (paraphrased, attributed): https://freemarker.apache.org/docs/

## Done when

- [x] Reference catalog module with summary + usage + example + manual URL per entry
- [x] CompletionItem `detail` + `documentation` (Markdown) for builtins/directives
- [x] Hover uses the same catalog
- [x] Unit tests for a few key entries (`has_content`, `c`, `list`, …)
- [x] Docs note attribution / where catalog lives

## Where

- Catalog: [`extension/src/reference/freemarkerRef.ts`](../../../extension/src/reference/freemarkerRef.ts)
- Wired via `catalog.ts` → `CompletionItemProvider` and `docs.ts` → Hover

## Out of scope

Full verbatim dump of the manual; offline mirror of entire Apache site; Korean translations of every entry (EN first).
