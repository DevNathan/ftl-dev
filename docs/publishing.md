# CodeOSS VSIX releases

The tag workflow publishes the CodeOSS extension to [Open VSX](https://open-vsx.org/extension/nathan-0910/ftl-dev) and attaches the same VSIX to [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases). Visual Studio Marketplace publishing is disabled.

## Release flow

1. Set `extension/package.json` to the release version and update `extension/CHANGELOG.md`.
2. Commit and push the release preparation to `main`.
3. Create and push the matching version tag:

   ```bash
   git tag -a "v1.0.3" -m "v1.0.3"
   git push origin "v1.0.3"
   ```

4. GitHub Actions checks the extension, packages the VSIX, attaches it to the GitHub Release, and saves a downloadable Actions artifact. It then publishes that package to Open VSX. A version already on Open VSX is skipped when the workflow runs again.

The tag must be `v` followed by the exact `extension/package.json` version. Set the `OVSX_PAT` GitHub Actions secret to an Open VSX access token with publishing access to `nathan-0910`. Without it, the workflow warns and skips Open VSX after creating the GitHub Release. See [versioning.md](versioning.md) for version policy.

## Install

In a CodeOSS editor that uses Open VSX, search for `nathan-0910.ftl-dev` in Extensions. For a manual install, download a `.vsix` from [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases) and choose **Install from VSIX…**.
