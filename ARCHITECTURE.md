# Architecture

Direction is recorded in [docs/decisions/0001-codeoss-language-stack.md](docs/decisions/0001-codeoss-language-stack.md). Product intent: [docs/product/vision.md](docs/product/vision.md).

## Overview

A CodeOSS (VS Code / Cursor / compatible) extension that treats FreeMarker as a **scripting language**: lexical highlighting plus a language service for navigation, completion, and semantic coloring. Primary target remains CodeOSS; a **shared LSP** under [`server/`](server/) serves Vim/Neovim (and can replace in-process providers later). Vim syntax lives in the separate **[`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim)** repository. See [ADR 0005](docs/decisions/0005-vim-neovim-port.md).

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
- **Completions (catalog)**: `completionContext(before)` classifies cursor context; a thin **CompletionEngine** walks pluggable **CompletionProviders** (directive, builtin, special, ns, general). `buildCompletions` delegates to the engine. Stable exports for the in-process host ([`completionProvider.ts`](extension/src/completionProvider.ts)) and the [`server/`](server/) LSP scaffold.
- **Context Analyzer** ([`extension/src/context/`](extension/src/context/)): shared cursor probing for completion, hover, and signature help — `completionContext` / `isInRecoverBody`, `builtinAt` / `directiveAt`, `identifierAt`. [`catalog.ts`](extension/src/catalog.ts), [`hoverTokens.ts`](extension/src/hoverTokens.ts), and [`symbols.ts`](extension/src/symbols.ts) are thin re-exports; FTL comment gating stays in [`comments.ts`](extension/src/comments.ts) (provider pre-check, outside Analyzer).
- **Parser implementation**: undecided (follow-up ADR).

## Editor integration

| Need | Typical CodeOSS hook |
|------|----------------------|
| Lexical highlight | TextMate grammar contribution |
| Rich highlight | Semantic tokens provider / LSP |
| Go to definition | `DefinitionProvider` / LSP `textDocument/definition` |
| Rename symbol (same-file) | `RenameProvider` (`renameSymbolAt` reuses reference hits) / LSP `textDocument/rename` |
| Linked tag-name editing (`<#if>`/`</#if>`) | `LinkedEditingRangeProvider` (`linkedEditing.ts` + `linkedEditingProvider.ts`; default on via `[freemarker]` `editor.linkedEditing`); not in LSP |
| Workspace symbol (Ctrl+T) | `WorkspaceSymbolProvider` (`searchWorkspaceSymbols` over open buffers + capped `findFiles`; provider-only registration) |
| Open import / path | `DocumentLinkProvider` + definition (new editor tab) |
| Completions | `CompletionItemProvider` / LSP completion |
| Directive auto-close | `autoClosingPairs` + snippets / on-type edits |
| FTL indent (`if`/`elseif`/`else` aligned) | `indentationRules` / `onEnterRules` in `language-configuration.json` (patterns in `src/indentRules.ts`); auto-close aligns `</` indent with opener |
| Comparison op presentation (`gte`→`>=`) | Text decorations ([ADR 0003](docs/decisions/0003-comparison-operator-presentation.md)); caret reveals source |
| Parameter hints (`#function` / `#macro`) | `SignatureHelpProvider` (`signatureHelp.ts`) / LSP |
| Vim / Neovim highlight + indent | Separate repo [`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim) |
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
