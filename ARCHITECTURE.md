# Architecture

Direction is recorded in [docs/decisions/0001-codeoss-language-stack.md](docs/decisions/0001-codeoss-language-stack.md). Product intent: [docs/product/vision.md](docs/product/vision.md).

## Overview

A CodeOSS (VS Code / Cursor / compatible) extension that treats FreeMarker as a **scripting language**: lexical highlighting plus a language service for navigation, completion, and semantic coloring. Primary target remains CodeOSS; a **shared LSP** under [`server/`](server/) serves Vim/Neovim (and can replace in-process providers later). Vim syntax lives under [`vim/`](vim/). See [ADR 0005](docs/decisions/0005-vim-neovim-port.md).

## Components

```text
┌─────────────────────────────────────────┐
│  Extension client (CodeOSS)             │
│  activate, settings, UX (tabs / links)  │
└───────────────┬─────────────────────────┘
                │ LSP or in-process APIs
┌───────────────▼─────────────────────────┐
│  Language service                       │
│  symbols, definition, links, completion │
│  semantic tokens, FTL indent / close    │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│  Grammar + language configuration       │
│  TextMate tokenize, pairs, onEnter      │
└─────────────────────────────────────────┘
```

Optional later: Java/bean metadata enrichment (best-effort; not required for core FTL).

## Language server / grammar

- **TextMate**: directives, interpolations, strings, comments, baseline expression scopes.
- **Semantic tokens** (service): distinguish hash keys, call targets, imported macros, known properties when resolvable.
- **Symbol / link model**: assigns, macros, functions, locals; `#import` / `#include` (and path forms) as document links and definition targets.
- **Parser implementation**: undecided (follow-up ADR).

## Editor integration

| Need | Typical CodeOSS hook |
|------|----------------------|
| Lexical highlight | TextMate grammar contribution |
| Rich highlight | Semantic tokens provider / LSP |
| Go to definition | `DefinitionProvider` / LSP `textDocument/definition` |
| Open import / path | `DocumentLinkProvider` + definition (new editor tab) |
| Completions | `CompletionItemProvider` / LSP completion |
| Directive auto-close | `autoClosingPairs` + snippets / on-type edits |
| FTL indent (`if`/`elseif`/`else` aligned) | `indentationRules` / `onEnterRules` in `language-configuration.json` (patterns in `src/indentRules.ts`); auto-close aligns `</` indent with opener |
| Comparison op presentation (`gte`→`>=`) | Text decorations ([ADR 0003](docs/decisions/0003-comparison-operator-presentation.md)); caret reveals source |
| Parameter hints (`#function` / `#macro`) | `SignatureHelpProvider` (`signatureHelp.ts`) / LSP |
| Vim / Neovim highlight + indent | [`vim/`](vim/) runtime (`syntax`, `indent`, `ftplugin`) |
| Shared language server | [`server/`](server/) stdio LSP (no comparison decorations) |

## Testing

| Mode | How | What it covers |
|------|-----|----------------|
| Manual UX | `F5` / Reload → fixtures | Colors, indent, Ctrl+click, completions (`<#`, `?`), comparison op display (`tests/fixtures/comparison/`) |
| Grammar regression | `cd extension && npm run test:grammar` | TextMate scopes (`tests/grammar/`) |
| Unit tests | `cd extension && npm run test:unit` | Symbol index, completions, reference docs, comparison op finder |

Implementation: [`extension/`](extension/) — grammar, language config, Definition / DocumentLink / Completion / Hover providers.

Apache FreeMarker Manual paraphrases for Ctrl+Space / Hover live in [`extension/src/reference/freemarkerRef.ts`](extension/src/reference/freemarkerRef.ts) (attributed to https://freemarker.apache.org/docs/).

## Open questions

- Parser / AST technology (tree-sitter vs other).
- LSP always vs hybrid in-process for v1.
- How far to integrate Java type information without owning a Java language server.
- Square-bracket vs angle-bracket directive syntax priority and parity.
