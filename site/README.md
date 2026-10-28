# Site

Source of the project page published to GitHub Pages: <https://devnathan.github.io/ftl-dev/>.

```bash
cd site
npm ci
npm run build      # → dist/ (open dist/index.html)
```

- `src/index.html` — the page (English + Korean, toggled in the nav). `{{sample:name}}` and `{{version}}` are filled in by `build.mjs`.
- `src/samples/*.ftl` — code shown on the page, highlighted with the extension's own grammar (`../extension/syntaxes/freemarker.tmLanguage.json`) via Shiki.
- `assets/` — `banner.svg` (also used by the repository README), `logo.svg`, `og.png` (social preview, rendered from the banner).

Deployed by [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) on pushes to `main` that touch the site or the grammar. One-time setup: **Settings → Pages → Source: GitHub Actions**.
