# tree-sitter-freemarker

Optional **Neovim** highlighting path for ftl-dev contributors. Classic Vim and Neovim users should install [`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim) (recommended default). This tree-sitter scaffold is **not** part of that plugin download.

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
