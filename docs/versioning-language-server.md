# Language server versioning

The language server is **not** a separately published user product (no npm, no `ls-v*` release pipeline).

If you change [`server/`](../server/) for contributors, keep `server/package.json` `"version"` as an internal monorepo marker only. User-facing Vim releases are versioned via [`vim/VERSION`](../vim/VERSION) — see [versioning-vim.md](versioning-vim.md).
