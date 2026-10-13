# Language server versioning

The language server is **not** a separately published user product (no npm, no `ls-v*` release pipeline).

If you change [`server/`](../server/) for contributors, keep `server/package.json` `"version"` as an internal marker only. User-facing Vim releases are versioned in [`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim) (`VERSION` + `v*` tags).
