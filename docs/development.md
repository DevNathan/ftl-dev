# Development

Run these commands from the repository root with Node.js 22, which the extension release workflow uses.

```sh
npm ci --prefix extension
npm ci --prefix server
npm test --prefix extension
npm run compile --prefix server
```

## Try the extension locally

Compile the extension and open a Development Host with its fixtures. Replace `code-oss` with the CLI for your editor if needed.

```sh
npm run compile --prefix extension
code-oss --extensionDevelopmentPath="$PWD/extension" "$PWD/tests/fixtures"
```

- [Playground](../tests/fixtures/playground/README.md) for highlighting, navigation, and diagnostics.
- [ftldoc fixtures](../tests/fixtures/ftldoc/README.md) for Hover, Signature Help, and completion.
- [Navigation sample](../tests/fixtures/navigation/main.ftl) for cross-file links and definitions.

To install into a regular editor window, run `npm run package --prefix extension` and open the resulting VSIX with **Install from VSIX…**.

After compiling, run `npm start --prefix server` to start the stdio language server. The [server README](../server/README.md) covers editor integration. The [tree-sitter grammar](../tree-sitter-freemarker/) is optional.

## Repository and local settings

- Set your preferred editor settings and debugger launch tasks locally. The repository ignores editor workspaces and agent-specific settings and locks.
- Shared agent instructions live in [AGENTS.md](../AGENTS.md). Installable skills live in [skills/](../skills/).
- Use the SSH remote `git@github.com:DevNathan/ftl-dev.git` for Git operations.
- Run `npm run check:terms --prefix extension` before committing. It skips the check if no forbidden-term list is configured.
- See the [architecture](../ARCHITECTURE.md), [site build](../site/README.md), and [release workflow](publishing.md).
