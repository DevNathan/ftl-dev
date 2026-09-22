# Agents

Short map for AI agents in **ftl-dev**. Details live under `docs/`—do not grow this file into an encyclopedia.

## Purpose (one line)

CodeOSS FreeMarker tooling for **FTL as a scripting / application-logic language**, not “HTML generation only.” See [docs/product/vision.md](docs/product/vision.md).

## Read order

1. This map  
2. [docs/product/vision.md](docs/product/vision.md)  
3. [ARCHITECTURE.md](ARCHITECTURE.md)  
4. [docs/index.md](docs/index.md) → relevant `docs/plans/active/` and `docs/decisions/`

## Doc map

| Path | What |
|------|------|
| [extension/](extension/) | CodeOSS extension (grammar spike) |
| [docs/product/](docs/product/) | Why we build this; capabilities |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the extension is structured |
| [docs/decisions/](docs/decisions/) | Lasting technical choices (ADRs) |
| [docs/plans/active/](docs/plans/active/) | Work in progress |
| [docs/plans/completed/](docs/plans/completed/) | Finished plans |
| [tests/](tests/) | Fixtures (`fixtures/`) + grammar tests (`grammar/`) |

## Operating principles

- Project knowledge stays **in this repository’s docs**, not only in chat.
- Important tech decisions → `docs/decisions/`.
- In-progress work → `docs/plans/active/`; when done → move to `docs/plans/completed/`.
- Prefer updating an existing plan/ADR over scattering notes.
- Do not invent architecture beyond what docs record; propose a decision doc when a choice must stick.

## Language

- Canonical docs: **English**.
- Korean: optional `*.ko.md` siblings.
- Chat may be Korean; lasting docs default to English unless asked for KO.

## Constraints

- Align changes with an active plan when one exists.
- Keep `AGENTS.md` short; put depth in `docs/`.
