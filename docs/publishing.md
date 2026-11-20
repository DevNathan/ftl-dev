# CodeOSS VSIX releases

The tag workflow publishes the CodeOSS extension to [Open VSX](https://open-vsx.org/extension/nathan-0910/ftl-dev) and attaches the same VSIX to [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases). Visual Studio Marketplace publishing is disabled.

## Release flow

1. Set `extension/package.json` to the release version. Move the release notes out of `[Unreleased]` into a dated version section in `extension/CHANGELOG.md`. Use headings such as `Added`, `Changed`, `Fixed`, and `Removed` for the changes that apply.
2. Preview the GitHub Release body with `node scripts/release-notes.mjs vX.Y.Z`, using the actual version tag. Commit and push the release preparation to `main`.
3. Create and push the matching version tag. The annotation can use the same Markdown:

   ```bash
   tag=vX.Y.Z
   notes_file="$(mktemp)"
   node scripts/release-notes.mjs "$tag" > "$notes_file" &&
     git tag -a "$tag" --cleanup=verbatim -F "$notes_file" &&
     git push origin "refs/tags/$tag"
   rm -f "$notes_file"
   ```

4. GitHub Actions uses the tagged version's changelog section as the Release body and adds installation links. A missing or empty entry stops the run before packaging. The workflow checks the extension, attaches the VSIX, saves an Actions artifact, and publishes the package to Open VSX. A rerun preserves the existing Release body and skips an Open VSX version that has already been published.

The tag must be `v` followed by the exact `extension/package.json` version. Set the `OVSX_PAT` GitHub Actions secret to an Open VSX access token with publishing access to `nathan-0910`. Without it, the workflow warns and skips Open VSX after creating the GitHub Release. See [versioning.md](versioning.md) for version policy.

## Install

In a CodeOSS editor that uses Open VSX, search for `nathan-0910.ftl-dev` in Extensions. For a manual install, download a `.vsix` from [GitHub Releases](https://github.com/DevNathan/ftl-dev/releases) and choose **Install from VSIX…**.
