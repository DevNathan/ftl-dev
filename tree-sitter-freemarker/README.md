# tree-sitter-freemarker

Optional **Neovim** highlighting path for ftl-dev. Classic Vim and Neovim both work with the Vim runtime under [`../vim/`](../vim/) (recommended default).

## Status

Scaffold grammar covering nested FTL comments, angle/square directives, and `${…}` interpolations. Not yet feature-complete vs the VS Code TextMate grammar.

## Build

```bash
cd tree-sitter-freemarker
npm install
npx tree-sitter generate
npx tree-sitter build
```

## Neovim

Prefer `:set runtimepath^=/path/to/ftl-dev/vim` for syntax highlighting until this parser is installed via `nvim-treesitter` custom parsers.
