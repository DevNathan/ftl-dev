<p align="center">
  <a href="https://devnathan.github.io/ftl-dev/"><img src="https://raw.githubusercontent.com/DevNathan/ftl-dev/main/site/assets/og.png" alt="ftl-dev 1.0.0 — FreeMarker, finally first-class" width="100%"></a>
</p>

# FTL-dev

> 🎉 **1.0.0 is out — the first stable release.** The extension id, language id and settings keys are now stable. [Project page](https://devnathan.github.io/ftl-dev/) · [What's new](CHANGELOG.md)

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
- Directive closing · FTL-aware indent
- Linked editing of open/close tag names (`<#if>` ↔ `</#if>`, `<@m>` ↔ `</@m>`)
- Diagnostics · semantic tokens · outline · find references
- ftldoc doc comments (Javadoc / JSDoc style: `@param {type} [name=default]`, multi-line `@return`, `@example`, `@note`, custom `@tag`, `{@link}` / `{@code}`) in Hover, Signature Help and completion
- (Optional) comparison-operator presentation (`lt` / `gt` etc. shown as symbols)

## Install

What else is there to do? Grab the extension from the VS Code or CodeOSS-family marketplace.

- Cursor / Open VSX · VS Code Marketplace: **FreeMarker (ftl-dev)** (`nathan-0910.ftl-dev`)
- Locally: `npm run package`, then **Install from VSIX…**

[Changelog lives here](CHANGELOG.md).
I keep it in English only—but you all read English fine, right? :)

## Develop (local)

From the `extension/` directory in the [repo](https://github.com/DevNathan/ftl-dev):

```bash
npm install && npm run compile
npm test
npm run package          # → ftl-dev-*.vsix
```

Do not forget `Reload Window` afterward. Try [tests/fixtures/navigation/main.ftl](https://github.com/DevNathan/ftl-dev/blob/main/tests/fixtures/navigation/main.ftl), or just hit **F5**.

## License

This project is under [Apache License 2.0](LICENSE).
Use it freely, keep the [NOTICE](NOTICE), and leave a link to the project: https://github.com/DevNathan/ftl-dev

## Language

Canonical docs are **English**. Optional Korean: [README.ko.md](https://github.com/DevNathan/ftl-dev/blob/main/README.ko.md) (`*.ko.md`).
