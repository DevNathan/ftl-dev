# Site

Source of the project page published to GitHub Pages: <https://devnathan.github.io/ftl-dev/>.

```bash
cd site
npm ci
npm test
npm run build      # → dist/
python3 -m http.server 4173 --directory dist
```

- `src/index.html` — the page (English + Korean, toggled in the nav). `{{sample:name}}` and `{{version}}` are filled in by `build.mjs`.
- `src/samples/*.ftl` — code shown on the page, highlighted with the extension's own grammar (`../extension/syntaxes/freemarker.tmLanguage.json`) via Shiki.
- `src/playground.html`, `src/playground.js`, `src/playground.css` — the browser editor, built with CodeMirror and Shiki. The main page links each code sample to its editable version.
- `src/playground-language.ts` — browser adapters for the extension's shared diagnostics, completion, definition and hover code, including ftldoc tag help. Imports and includes resolve against the example files, including edits made during the session.
- `src/playground-highlight.js` — the browser highlighter, using the same TextMate grammar as the static samples. Tests check token ranges and both theme colors across all examples.
- `src/code-themes.js` — shared sample/editor themes with comment contrast adjusted for the site's panels.
- `src/preferences.js` — inlined into both pages before styles so language and theme preferences apply before the first paint.
- `assets/` — `banner.svg` (also used by the repository README), `logo.svg`, `og.png` (social preview, rendered from the banner).

Open <http://localhost:4173/> after starting the server. The playground needs HTTP to load its example files; opening the HTML directly from disk will not work.

The build copies FTL fixtures from `tests/fixtures/playground`, `navigation`, and `ftldoc` into the playground. Some examples contain deliberate errors. Edits stay in memory in the current tab; users can reset or download each file. Only language and theme preferences are saved locally. Templates are analyzed, not executed: rendering needs a FreeMarker runtime. Analysis pauses above 30,000 characters, and syntax coloring also pauses for lines longer than 2,000 characters.

The editor loads its grammar and WebAssembly in a separate chunk after editing and diagnostics are available. If that chunk fails, the editor stays usable and reports the missing colors.

For UI checks, try both languages and themes at 320 CSS pixels and a desktop width. Use Tab to reach the skip link and code samples; in the editor, use F1 to open documentation and Escape to return to editing. Check completion near viewport edges, command-copy feedback, and the reduced-motion preference. Celebration only runs when requested. These checks complement automated tests; they do not replace testing with screen readers and real touch devices.

The [Pages workflow](../.github/workflows/pages.yml) deploys on every push to `main`. To redeploy the current `main` without a new commit, open **Actions → Pages → Run workflow** and select `main`.

One-time setup: **Settings → Pages → Source: GitHub Actions**.
