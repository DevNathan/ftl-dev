<p align="center">
  <a href="https://devnathan.github.io/ftl-dev/"><img src="site/assets/banner.svg" alt="ftl-dev 1.0: FreeMarker language support" width="100%"></a>
</p>

<p align="center">

[![Open VSX](https://img.shields.io/open-vsx/v/nathan-0910/ftl-dev?label=Open%20VSX&color=0050b2)](https://open-vsx.org/extension/nathan-0910/ftl-dev)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/nathan-0910.ftl-dev?label=VS%20Code%20Marketplace&color=0050b2)](https://marketplace.visualstudio.com/items?itemName=nathan-0910.ftl-dev)
[![License](https://img.shields.io/badge/license-Apache--2.0-0a8f6c)](LICENSE)

</p>

# FTL-dev

> [!TIP]
> **1.0 is out.** It's been stable for a while now, so I'm calling it.
> From here on I won't rename the extension id, language id, settings keys or `.ftl-data-model.json` without a major version bump ([details](docs/versioning.md#stability-contract-from-100)).
> [Project page](https://devnathan.github.io/ftl-dev/) · [Changelog](extension/CHANGELOG.md)

Did you know FreeMarker (ftl for short) can be used as a real programming language? ftl is faster than light (okay, heavily exaggerated), and while it is less extensible than mainstream languages, it is not exactly *insufficient*. Anyway, people barely use ftl, so of course there was no decent all-in-one extension.

So I built one. With this extension, working in ftl should hurt a little less.

## Why bother / what it fixes

Existing ftl extensions leave a lot to be desired.

- Syntax highlighting that is ugly as hell or just wrong
- No jump-to-definition for variables and functions—so you dig through files by hand
- Syntax errors that never get flagged
- Auto-indent that ignores how ftl is actually supposed to look

Why does nobody support this junk? Probably because nobody uses ftl.
If the well is dry, dig your own. This extension aims for:

- Highlighting readable enough that your eyeballs stay in your head
- Ctrl+click to jump to variable and function declarations
- Catching grammar mistakes before things blow up
- Auto-indent that follows ftl conventions

## Features

- Syntax highlighting, including SQL inside `<#assign sql…>` capture blocks or blocks marked `<#-- @lang sql -->`
- Go-to / navigate definitions, imports, and paths
- Completions
- Parameter hints for `#function` / `#macro` calls (Signature Help)
- Directive closing · FTL-aware indent
- Diagnostics · semantic tokens · outline · find references
- (Optional) comparison-operator presentation (`lt` / `gt` etc. shown as symbols)

## Install

What else is there to do? Grab the extension from the VS Code or CodeOSS-family marketplace.

- Cursor / Open VSX · VS Code Marketplace: **FreeMarker (ftl-dev)** (`nathan-0910.ftl-dev`)
- Locally: `cd extension && npm run package`, then **Install from VSIX…**

### Vim / Neovim

Separate repository: **[DevNathan/ftl-dev.vim](https://github.com/DevNathan/ftl-dev.vim)** (Pathogen / Vundle / vim-plug). Not developed or published from this VSIX tree. Capability matrix: [docs/product/vim-neovim-matrix.md](docs/product/vim-neovim-matrix.md).

[Changelog lives here](extension/CHANGELOG.md).
I keep it in English only—but you all read English fine, right? :)

## Develop (local)

```bash
cd extension && npm install && npm run compile
npm test
npm run package          # → ftl-dev-*.vsix
```

Do not forget `Reload Window` afterward. Try [`tests/fixtures/navigation/main.ftl`](tests/fixtures/navigation/main.ftl), or just hit **F5**.

## License

This project is under [Apache License 2.0](LICENSE).
Use it freely, keep the [NOTICE](NOTICE), and leave a link to the project: https://github.com/DevNathan/ftl-dev

## Language

Canonical docs are **English**. Optional Korean: [README.ko.md](README.ko.md) (`*.ko.md`).
