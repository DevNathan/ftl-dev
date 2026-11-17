[한국어 README](README.ko.md)

# ftl-dev

FreeMarker support for CodeOSS editors. Jump from a macro call to its definition, catch mismatched FTL blocks while editing, and read a template's ftldoc from its import path.

[Project site](https://devnathan.github.io/ftl-dev/) · [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases) · [Changelog](extension/CHANGELOG.md)

## Install

1. **CodeOSS editors with Open VSX:** search Extensions for [FreeMarker (ftl-dev)](https://open-vsx.org/extension/nathan-0910/ftl-dev), extension ID `nathan-0910.ftl-dev`.
2. **Manual installation:** download the VSIX from [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases) and choose **Install from VSIX…** in your editor.

The extension is unavailable in Microsoft VS Code's Visual Studio Marketplace. For Vim or Neovim, see [ftl-dev.vim](https://github.com/DevNathan/ftl-dev.vim).

## What it supports

- **Read FTL in context.** Highlight FreeMarker inside HTML and SQL inside FTL capture blocks. Follow import paths, find references, and rename symbols.
- **Edit FTL blocks.** Get completions and parameter hints, close tags automatically, and see diagnostics for invalid directives and block structure.
- **Read docs where you call the code.** Hover a macro or function for its ftldoc. Hover an import or include path for the target file's description.

## Coding agent skills

Run the command for the skill you want in your project directory.

### [FTL writing](skills/ftl-writing/SKILL.md)

Choose readable FTL expressions and decide where to split templates into macros, functions, or files.

```sh
npx skills add https://github.com/DevNathan/ftl-dev --skill ftl-writing
```

### [ftldoc](skills/ftldoc/SKILL.md)

Write file and declaration comments that appear in the editor.

```sh
npx skills add https://github.com/DevNathan/ftl-dev --skill ftldoc
```

## Development

[Local setup and manual checks](docs/development.md) · [Documentation index](docs/index.md) · [Extension architecture](ARCHITECTURE.md)

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE).

<sub>Development and maintenance are handled entirely by AI agents.</sub>
