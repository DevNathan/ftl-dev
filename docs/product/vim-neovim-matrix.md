# ftl-dev → Vim / Neovim capability matrix

- Date: 2026-10-13
- ADR: [0005-vim-neovim-port.md](../decisions/0005-vim-neovim-port.md)
- Assumption: language logic is shared via **LSP** ([`server/`](../../server/)); syntax via **[`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim)** (separate git).

## Required

| Feature | Vim | Neovim | Notes |
|---------|-----|--------|-------|
| Lexical / syntax highlighting | **Supported** | **Supported** | `ftl-dev.vim` syntax; optional [`tree-sitter-freemarker`](../../tree-sitter-freemarker/) in this VSIX repo only |

## Via LSP (`server/`) — reuses `extension/src`

| Feature | Vim | Neovim | Notes |
|---------|-----|--------|-------|
| Diagnostics (layer A, comment delimiters) | **Supported** | **Supported** | Needs LSP client on classic Vim |
| Go to definition | **Supported** | **Supported** | |
| Find references | **Supported** | **Supported** | Same-file + `ns.sym` |
| Document outline / symbols | **Supported** | **Supported** | |
| Completions + catalog | **Supported** | **Supported** | |
| Hover | **Supported** | **Supported** | |
| Signature Help (`#function` / `#macro`) | **Supported** | **Supported** | |
| Import / include document links | **Supported** | **Supported** | |
| Semantic-style coloring | Limited | **Supported*** | *If client supports semantic tokens; not yet in server v1 — use syntax / tree-sitter |

Without LSP, the rows above are **not** provided by the Vim runtime alone.

## Editor-local (no LSP)

| Feature | Vim | Neovim | Notes |
|---------|-----|--------|-------|
| Indent (`#if` / `#else` / `#recover`) | **Supported** | **Supported** | `ftl-dev.vim` indent |
| `${` auto-close | **Approximate** | **Approximate** | ftplugin mapping |
| Comment toggle | **Supported** | **Supported** | `commentstring` |
| Match / jump block tags | **Approximate** | **Approximate** | matchit `b:match_words` |
| `gf` for include/import paths | **Approximate** | **Approximate** | `include` / `includeexpr` |

## Not in Vim/Neovim port (initial) / not portable as-is

| Feature | Verdict | Reason |
|---------|---------|--------|
| Comparison operator presentation (`gte`→`>=`) | **Deferred** | VS Code decorations ([ADR 0003](../decisions/0003-comparison-operator-presentation.md)); not in LSP |
| In-process VS Code providers | **N/A** | Use LSP instead |
| TextMate grammar file unchanged | **Impossible** | Different engine |
| Java / data-model enrichment | **Deferred (all editors)** | ADR 0002 |
| Rename / workspace symbols | **Not implemented (all editors)** | Future LSP |
| Linked tag-name editing (`<#if>`/`</#if>`) | **VS Code only** | `LinkedEditingRangeProvider` (plan 0035); LSP `textDocument/linkedEditingRange` / Vim is a follow-up |

## Install

```vim
Plugin 'DevNathan/ftl-dev.vim'
" or: Plug 'DevNathan/ftl-dev.vim'
```

```bash
git clone https://github.com/DevNathan/ftl-dev.vim.git ~/.vim/bundle/ftl-dev.vim
```

Language server is optional tooling in **this** (VSIX) repo only (not npm, not part of the Plug download).
