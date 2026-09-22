# Master program: IDE parity wave 1

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22
- Owner: master agent (plan / integrate / QA); implementation via fresh subagents per task

## Goal

Raise ftl-dev from “editor spike” toward C/Java-class IDE feel for **FTL-local** features (no Java LS yet).

## Wave 1 tasks (parallel agents, isolated modules)

| ID | Plan | Agent owns (create/edit) | Do not touch |
|----|------|--------------------------|--------------|
| A | [0009-semantic-tokens.md](0009-semantic-tokens.md) | `extension/src/semanticTokens*.ts` + unit test | `diagnostics.ts`, close/indent |
| B | [0010-symbols-outline-references.md](0010-symbols-outline-references.md) | `extension/src/outline.ts`, `references.ts` (+ tests) | semanticTokens, diagnostics rules |
| C | [0011-diagnostics-phase2.md](0011-diagnostics-phase2.md) | `extension/src/diagnostics.ts` + `diagnostics.test.ts` only | providers unrelated to diags |

**Master** (this session) after agents return:

1. Wire `extension.ts` / `package.json` `test:unit` once
2. Run `npm test`, fix integration conflicts
3. Update `docs/product/requirements-status.md` + move plans → completed when green

## Out of wave 1

Rename provider, LSP extraction, Java bean enrichment, full formatter.
