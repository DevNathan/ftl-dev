# ftl-dev.vim

FreeMarker syntax and editing helpers for Vim / Neovim.

When opening a `.ftl` / `.ftlh` / `.ftlx` file the filetype is set to **`freemarker`**, which activates syntax highlighting. The plugin also provides indent rules and a few quick-editing helpers (`commentstring`, matchit words, `${` pairing, `gf` on include/import paths).

Developed in the [ftl-dev](https://github.com/DevNathan/ftl-dev) monorepo (`vim/` folder) and published as this repo for plugin managers.

## Installation

### Pathogen

```bash
git clone https://github.com/DevNathan/ftl-dev.vim.git ~/.vim/bundle/ftl-dev.vim
```

### Vundle

Add to your vimrc:

```vim
Plugin 'DevNathan/ftl-dev.vim'
```

Then `:PluginInstall`.

### vim-plug

```vim
Plug 'DevNathan/ftl-dev.vim'
```

Then `:PlugInstall`.

### lazy.nvim (Neovim)

```lua
{ "DevNathan/ftl-dev.vim", lazy = false }
```

## What you get

- Syntax (nested `<#-- -->` / `[#-- --]`, angle/square directives, `${…}`, `?builtins`)
- Indent aligned with `#if` / `#else` / `#recover` / macros
- Filetype helpers for comments and navigation

FTL directives are highlighted as a **single** group (no mid-name colour split). Built-ins like `?size` use a distinct `ftlBuiltin` colour. Defaults use 256-colour / `guifg` values; enable truecolor if you want the hex colours:

```vim
set termguicolors
```

Vim is not limited to 16 colours when the terminal supports 256 or truecolor — old “hurting” looks usually came from linking everything to the colorscheme’s `Statement` / `PreProc` / HTML tag groups.

## Tests

```bash
cd vim && bash test/run.sh
```

Requires `vim`, `git`, `python3`, and `nvim` (for `lua/ftl_dev/lsp.lua`).

The runner:

1. Checks [test/coverage_inventory.json](test/coverage_inventory.json) tags (**100% inventory**)
2. **`syntax_smoke.vim`** — sources `syntax/freemarker.vim` and **fails on E866/E475** (Vim NFA regexp mistakes). Inventory-only tagging is not enough; this is the load gate.
3. Vader suite + Neovim lua tests

Version: see [`VERSION`](VERSION). Updates: re-pull with your plugin manager (`PluginUpdate` / `PlugUpdate` / …).

## License

Apache-2.0 — [LICENSE](LICENSE).
