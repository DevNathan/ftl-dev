# ftl-dev

CodeOSS-family FreeMarker (`.ftl`) language support aimed at **real FTL scripting**—not merely HTML template coloring.

FreeMarker is often used as a fast application/scripting layer on Java stacks, but editor tooling lags far behind C/Java-class extensions. This project closes that gap: stronger highlighting, go-to-definition and path navigation, completions, directive closing, and FTL-aware indentation.

## Install

After Open VSX publish: search **FreeMarker (ftl-dev)** in Cursor / VS Code (Open VSX).  
Or build a VSIX: `cd extension && npm run package` then **Install from VSIX…**.

## Docs

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](AGENTS.md) | Agent navigation map |
| [docs/product/vision.md](docs/product/vision.md) | Product purpose and core features |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical design |
| [docs/index.md](docs/index.md) | Full documentation map |
| [docs/product/requirements-status.md](docs/product/requirements-status.md) | Shipped vs gaps |

## Extension

Code lives in [`extension/`](extension/).

```bash
cd extension && npm install && npm run compile
npm test
npm run package          # → ftl-dev-*.vsix
# npx ovsx publish ftl-dev-*.vsix   # requires Open VSX token
```

Manual: **Reload Window**, then open [`tests/fixtures/navigation/main.ftl`](tests/fixtures/navigation/main.ftl). Or **F5** (Run Extension).

## License

[Apache License 2.0](LICENSE). Free to use and redistribute; keep [NOTICE](NOTICE) and **link to the project**: https://github.com/DevNathan/ftl-dev

## Language

Canonical documentation is **English**. Optional Korean siblings use the `*.ko.md` suffix (e.g. [README.ko.md](README.ko.md)).
