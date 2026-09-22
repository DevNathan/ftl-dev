# ADR 0001: CodeOSS language-support stack

- Status: Accepted (direction)
- Date: 2026-09-22

## Context

We need FreeMarker support on CodeOSS-family editors (VS Code, Cursor, etc.): highlighting, go-to-definition (including cross-file import/path navigation), completions, directive auto-close, and FTL-aware indentation.

CodeOSS exposes language features in layers:

1. **Declarative** — `package.json` language contribution, TextMate grammar, `language-configuration.json` (brackets, auto-closing pairs, `indentationRules`, `onEnterRules`).
2. **Programmatic providers** — completion, definition, references, document links, semantic tokens, on-type formatting, etc. (extension host APIs).
3. **Language Server Protocol (LSP)** — same capabilities in a separate process; reusable across LSP clients; standard for go-to, completion, diagnostics, semantic tokens.

Existing marketplace FreeMarker extensions tend to be TextMate/snippet-only or early-stage LSP (e.g. incomplete servers). Neither meets “scripting language IDE” quality alone.

## Decision

Adopt a **layered CodeOSS extension**:

| Layer | Role |
|-------|------|
| TextMate grammar (+ language config) | Fast lexical highlighting; basic pairs; baseline indent/close hooks |
| Language service (prefer LSP) | Definitions, completions, links, semantic tokens, richer close/indent logic |
| Extension client | Activate server, wire editor UX (peek/new tab), settings, packaging for CodeOSS |

Rationale:

- Regex grammar alone cannot reliably color `hash.key`, imported macros, or Java-backed `obj.method`.
- Go-to and cross-file import/path navigation require a symbol model → language service / LSP.
- LSP keeps the door open for other editors later; CodeOSS remains the primary client.
- FTL-specific indent (e.g. keep `#elseif` / `#else` aligned with `#if`) needs custom `onEnterRules` / indent rules and possibly on-type formatting—not HTML defaults.

Java bean enrichment is **best-effort** and optional; core FTL scripting must work without a full Java language server.

## Consequences

- Implementation order: grammar + language config → document symbols / definition / links → completions → semantic tokens → polish close/indent.
- Parser choice (hand-rolled, tree-sitter, etc.) is a follow-up ADR; this ADR only locks the **extension layering**.
- We do not rely on unmaintained marketplace extensions as the product; we may study them for grammar/edge cases.

## References

- [Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)
- [Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide)
- [Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide)
- [Language Configuration Guide](https://code.visualstudio.com/api/language-extensions/language-configuration-guide)
