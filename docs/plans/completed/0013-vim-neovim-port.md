# Plan 0013: Vim / Neovim port (syntax + LSP scaffold)

- Status: Completed (scaffold)
- Date: 2026-10-13
- ADR: [0005](../../decisions/0005-vim-neovim-port.md)
- Matrix: [vim-neovim-matrix.md](../../product/vim-neovim-matrix.md)

## Done

1. Vim runtime: `ftdetect`, `syntax`, `indent`, `ftplugin` under [`vim/`](../../vim/).
2. Optional tree-sitter scaffold: [`tree-sitter-freemarker/`](../../tree-sitter-freemarker/).
3. Language server reusing `extension/src`: [`server/`](../../server/) (diagnostics, completion, hover, definition, references, symbols, signature help, document links).
4. Comparison presentation explicitly out of scope for this port.

## Follow-ups

- Wire VS Code extension to spawn `server/` instead of in-process providers.
- Harden tree-sitter grammar + nvim-treesitter registration.
- Semantic tokens on the LSP if Neovim clients need them.
