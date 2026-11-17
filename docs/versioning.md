# Extension versioning

The canonical version is `extension/package.json` → `version`. A release tag must match it exactly: package version `1.0.3` uses tag `v1.0.3`.

See [publishing.md](publishing.md) for the GitHub Releases and Open VSX workflow.

## Version scheme

Use semantic versioning:

| Bump | When |
|------|------|
| PATCH | Bug fixes, docs-only packaging changes, and small UX changes |
| MINOR | New user-visible features that preserve existing FTL editing behavior |
| MAJOR | Breaking changes users must notice |

Do not create README or tag versions that disagree with `package.json`.

## Stability contract (from 1.0.0)

Starting with `1.0.0`, these are public API and only change in a MAJOR release (deprecate in a MINOR first when possible):

| Surface | Current value |
|---------|---------------|
| Extension id | `nathan-0910.ftl-dev` |
| Language id / file extensions | `freemarker` / `.ftl`, `.ftlh`, `.ftlx` |
| Grammar scope name | `text.html.freemarker` |
| Settings keys | `ftl-dev.strictVariables`, `ftl-dev.dataModel`, `ftl-dev.ftldoc.validateParams` |
| Project file | `.ftl-data-model.json` (`roots`, `templates`) |
| Icon theme id | `ftl-dev-icons` |

Exact TextMate sub-scopes and colors, diagnostic wording, completion ordering, and new diagnostics that only flag invalid FTL are not covered. A default-on diagnostic that flags valid FTL is a bug.

The former `ftl-dev.comparisonOperatorPresentation` setting was retired with its editor decoration provider.

## Release preparation

Before creating a release:

1. Bump `extension/package.json` to a new version.
2. Update `extension/CHANGELOG.md` and move the release notes under that version and date.
3. Commit and push the release preparation to `main`.
4. Push the matching `vX.Y.Z` tag. The workflow checks the version, runs checks, and packages the VSIX for GitHub Releases and Open VSX.

Pushing a branch alone runs CI and does not create a downloadable release. WIP commits do not need a version bump; bump when preparing a release.
