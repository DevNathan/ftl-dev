# Plan: Outline + Find References

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22
- Agent task: B

## Goal

Ship Document Symbol outline and Find All References for FTL symbols (assign/macro/function), matching common C/Java IDE navigation polish.

## Done when

- [x] `DocumentSymbolProvider` — macros, functions, assigns (and nested where cheap)
- [x] `ReferenceProvider` — same-file references; import `ns.sym` best-effort
- [x] Unit tests for outline list + reference offsets
- [x] Modules ready for master to register in `extension.ts`

## Out of scope

RenameProvider; workspace-wide reference search across all files (optional stretch: open documents / import graph only).
