# ADR 0004: Per-version changelog management

- Status: Accepted
- Date: 2026-09-24

## Context

Releases are identified by `extension/package.json` `"version"` ([versioning.md](../versioning.md)). Registries (Open VSX, VS Marketplace) and GitHub Releases need a **human-readable** record of what changed per version. Without a single convention, notes scatter across commit messages, chat, and release drafts, and Marketplace/Open VSX have nothing reliable to show on the extension page.

## Options considered

| Approach | Pros | Cons |
|----------|------|------|
| A. Git log / GitHub Release body only | No extra file | Not in the VSIX; Marketplace changelog empty; easy to omit when using workflow_dispatch |
| B. Root `CHANGELOG.md` only | Visible in repo | Not packaged into the extension unless copied; two places to sync |
| C. `extension/CHANGELOG.md` (Keep a Changelog) | Shipped in VSIX; shown by Marketplace/Open VSX; one file next to `package.json` | Must edit on every release-prep |

## Decision

Adopt **option C**.

1. **Canonical file:** [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md) — English only.
2. **Format:** [Keep a Changelog](https://keepachangelog.com/) + semver section headings that match `package.json` (e.g. `## [0.0.12] - YYYY-MM-DD`).
3. **Sections inside a version** (omit empty ones): `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, `Security`.
4. **`## [Unreleased]`** at the top: accumulate user-facing notes while developing; on release-prep, rename that block to the new version + date and leave a fresh empty `Unreleased`.
5. **Same commit as the version bump:** updating `package.json` `"version"` without a matching changelog entry for that version is incomplete release-prep ([versioning.md](../versioning.md)).
6. **Audience:** end users and extension hosts — short, concrete bullets. No internal plan numbers, agent notes, or raw commit dumps. Link to docs/ADRs only when users need deeper context.
7. **GitHub Release:** body may summarize or paste the matching section; the file remains source of truth.
8. **Do not** maintain a parallel Korean changelog.

## Consequences

- Release-prep checklist grows by one file edit; publish automation unchanged.
- Older installs that never shipped a changelog gain history starting from documented versions (seed `0.0.11`, then onward).
- Publisher/id moves are noted under `Changed` when user-visible (e.g. extension id `nathan-0910.ftl-dev`).
