# Extension versioning

Canonical version for the **VS Code / Open VSX extension** is **`extension/package.json` → `"version"`**.

The Vim plugin uses a **separate** version file — see [versioning-vim.md](versioning-vim.md) (`vim/VERSION` → repo `ftl-dev.vim`).

That string is the marketplace identity of a release. Open VSX and Visual Studio Marketplace both refuse (or ignore) republishing the **same** `publisher.name` + `version`. Ship a **new** version every time you intend to publish.

See also: [publishing.md](publishing.md).

## Scheme

Use **semver** `MAJOR.MINOR.PATCH` (currently `0.0.x` while the product is early):

| Bump | When |
|------|------|
| **PATCH** (`0.0.11` → `0.0.12`) | Bug fixes, docs-only packaging changes, small UX tweaks, publisher/namespace moves that still need a fresh upload |
| **MINOR** (`0.0.x` → `0.1.0`) | New user-visible features without breaking existing FTL editing behavior |
| **MAJOR** (`0.x` → `1.0.0` or `1.x` → `2.0.0`) | Breaking changes users must notice (removed commands, incompatible defaults, etc.) |

Do not invent parallel version numbers in README or tags that disagree with `package.json`. Git tags should mirror it: `v0.0.12` for version `0.0.12`.

## When to bump

Bump **before** (or as part of) the commit that prepares a publishable tree:

- Code or grammar changes users will get via update
- Publishing under a new publisher/namespace (new extension id) still needs a version that registry accepts for that id
- Any run of the publish workflow / `ovsx publish` / `vsce publish`

Do **not** bump for WIP commits you are not going to publish yet—bump on the **release-prep** commit (or immediately before it), so `main` at publish time already has the new version.

## Hard rule: release-prep commit

**The last commit before deploy must set `"version"` to a value that has never been published** for the current `publisher` + `name` on the target registry (Open VSX and/or Marketplace).

Checklist:

1. Look up what is already live (e.g. Open VSX / Marketplace extension page, or last successful publish).
2. Set `extension/package.json` `"version"` to something **strictly newer** (usual: next PATCH).
3. Commit that bump **with** the shippable code (or as the final commit on top).
4. Push `main`, then create and push tag `vX.Y.Z` (see [publishing.md](publishing.md)). **Do not** expect a branch push alone to publish.

Publishing `0.0.11` again after `0.0.11` is already on a registry will fail or leave users without an update. “Same code, same version” is not a valid release.

## What does *not* need a bump

- Local `npm test` / F5 debugging
- Docs-only edits that you are **not** packaging into a VSIX release
- Branch experiments you will not publish

If those docs or fixes later ship in a VSIX, they ride along with the next bumped version.

## Publisher vs version

`publisher` (e.g. `nathan-0910`) and `name` (`ftl-dev`) define the extension id (`nathan-0910.ftl-dev`). Changing publisher creates a **new** id; old installs do not auto-migrate. Versioning still applies independently on each id: first publish under a new publisher can reuse a PATCH like `0.0.11` **only if** that id never had that version. Prefer bumping when both registries must stay in sync and one already has the old version.

## Practical flow

```text
1. Finish the change on a branch / working tree
2. Decide PATCH / MINOR / MAJOR
3. Edit extension/package.json "version" + CHANGELOG
4. Commit (release-prep) — version must differ from last published
5. Push main (CI tests only — no marketplace publish)
6. git tag -a vX.Y.Z && git push origin vX.Y.Z  → Publish Extension runs
```

Mismatch between tag and `package.json` confuses humans and fails CI; keep them equal (`v` + version).

**Every new marketplace version requires a new tag.** Re-pushing `main` without a new `v*` tag does not publish.

## Changelog

User-facing notes per version live in [`extension/CHANGELOG.md`](../extension/CHANGELOG.md) (Keep a Changelog). Policy: [decisions/0004-changelog.md](decisions/0004-changelog.md).

On every release-prep commit:

1. Move bullets from `## [Unreleased]` into `## [X.Y.Z] - YYYY-MM-DD`.
2. Leave an empty `## [Unreleased]` at the top.
3. Bump `package.json` `"version"` to that same `X.Y.Z`.

