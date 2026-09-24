# Publishing (Open VSX + VS Code Marketplace)

Automated via GitHub Actions: [`.github/workflows/publish-extension.yml`](../../.github/workflows/publish-extension.yml).

**Publish does not run on ordinary pushes to `main`.** Every marketplace ship is a **version tag** `vX.Y.Z`. CI ([`ci.yml`](../../.github/workflows/ci.yml)) still runs tests on `main` / PRs; that is not a release.

## One-time setup (secrets)

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Where to get it |
|--------|-----------------|
| `OVSX_PAT` | [open-vsx.org → Access Tokens](https://open-vsx.org/user-settings/tokens) |
| `VSCE_PAT` | Azure DevOps PAT with **Marketplace → Publish** ([guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token)) |

`package.json` `publisher` must match both registries (currently `nathan-0910`).

Do **not** put tokens in the repo, chat, or CI logs.

Version bumps: see **[versioning.md](versioning.md)**. The release-prep commit must use a version that has **never** been published for this extension id.

## Release flow (always use a tag)

For **every** new published version:

1. Bump `extension/package.json` `"version"` per [versioning.md](versioning.md).
2. Update [`extension/CHANGELOG.md`](../extension/CHANGELOG.md) for that version ([ADR 0004](decisions/0004-changelog.md)).
3. Commit & push to `main` (this alone does **not** publish).
4. Create and push a tag that **exactly** matches the version:
   ```bash
   git tag -a "v0.0.12" -m "v0.0.12"
   git push origin "v0.0.12"
   ```
   Tag shape: `v` + `package.json` version (e.g. `0.0.12` → `v0.0.12`). The workflow fails if they differ.
5. Optional but recommended: GitHub → **Releases → Draft a new release** from that tag; paste the changelog section into the notes. The publish job is triggered by the **tag push**, not by drafting notes.

Users with the extension installed get updates through the editor’s normal update channel (Open VSX for Cursor; Marketplace for VS Code).

## Local (optional)

```bash
cd extension
npm run package
# npx ovsx publish ftl-dev-*.vsix -p "$OVSX_PAT"
# npx @vscode/vsce publish --packagePath ftl-dev-*.vsix -p "$VSCE_PAT"
```
