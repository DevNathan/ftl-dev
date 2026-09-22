# Product vision

## Why this exists

FreeMarker (`.ftl`) is often treated as “HTML template generation.” In practice it is also used as a **fast scripting / application-logic** language on top of Java (and related stacks). That workload needs editor tooling closer to C or Java—not a thin colorizer.

Existing CodeOSS-family FreeMarker extensions are thin, incomplete, or poorly maintained. **ftl-dev** aims to make day-to-day FTL development productive: reliable highlighting, navigation, completion, and editor ergonomics that match how FTL is actually written.

## Non-goals (for now)

- Replacing the FreeMarker runtime or adding a new template language.
- Perfect Java IDE features for every bean exposed into templates (best-effort enrichment only).
- Shipping non–CodeOSS editors first (LSP may allow later reuse; CodeOSS is primary).

## Core capabilities

### Syntax highlighting

Lexical + semantic coloring beyond “everything is a string.”

Examples of situations that must work well:

- Hash / map access: `hash.key`, nested paths.
- Function / method call sites and names.
- Values passed from Java (beans / classes) used as `object.method` / property access in FTL.
- Directives, interpolations, built-ins, strings, and nested expressions in varied contexts.

### Go to definition and navigation

- Jump from uses of macros, functions, and variables to their declarations.
- Jump into symbols imported from other FTL files (open target in an editor tab / window as the host supports).
- Treat include/import path references as navigable (click / go-to opens the target file).

### Completions

- Directives, built-ins, in-scope macros/functions/variables.
- Context-aware suggestions (not only static snippets).

### Tag / directive closing

- When opening a FreeMarker directive/tag, offer closing behavior in the spirit of HTML auto-close—adapted to FTL directive syntax (`<#…>` / `[#…]` as applicable).

### Indentation (FTL-aware, not HTML-cloned)

- Auto-indent for nested structure where it aids readability.
- **Do not** force HTML-like indent for chain forms such as `#if` / `#elseif` / `#else` when that harms readability (sibling branches should stay aligned where FTL style expects it).

## Success criteria (directional)

- Writing and navigating non-trivial FTL scripts feels comparable to mainstream language extensions, not “template color only.”
- Features degrade gracefully when Java type info is unavailable.
- Knowledge and decisions stay in-repo (`docs/`), so agents and humans share one map.
