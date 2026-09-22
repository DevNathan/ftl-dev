# FreeMarker (ftl-dev)

CodeOSS / VS Code / Cursor extension for FreeMarker (`.ftl`) as a **scripting** language: highlighting, navigation, completions (with Apache Manual paraphrases), auto-close, FTL-aware indent, diagnostics, semantic tokens, outline, and find-references.

## Install

- Open VSX (Cursor / CodeOSS): search **FreeMarker (ftl-dev)** after publish.
- From VSIX: `Extensions: Install from VSIX…`

## License

Apache License 2.0. You may use and redistribute freely, provided you keep the [NOTICE](NOTICE) attribution and **link to the project**: https://github.com/DevNathan/ftl-dev

## Develop

```bash
npm install
npm run compile
npm test
npm run package
```

F5 or symlink into `~/.cursor/extensions/` then Reload Window.
