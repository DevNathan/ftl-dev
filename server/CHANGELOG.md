# Changelog — language server (internal)

Not a public npm package. Track meaningful server changes here for contributors only.

## [Unreleased]

## [0.4.0] - 2026-10-20

Contributor note for the extension **0.4.0** release (server `package.json` stays at **0.1.0** — internal / not npm-published; versioning is independent of the VS Code extension).

- Hover probe order matches VS Code (`builtin` → `directive` → `namedParam` → symbol) (plan 0032c)

## [0.1.0] - 2026-10-13

- Initial stdio server scaffolding (reuses `extension/src`)
