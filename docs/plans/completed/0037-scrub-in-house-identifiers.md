# 0037 - Scrub the in-house identifiers from both repos (history rewrite + guard)

Status: **completed** 2026-10-21 (User actions pending: force push incl. tags, `FTL_DEV_FORBIDDEN_TERMS` secret in both repos, delete old Actions runs/artifacts, check releases/PRs/issues/branches, GitHub Support purge, delete `_backup/` when satisfied)  
Started: 2026-10-21  
Repos: **both** `vsix/` (`ftl-dev`) and `vim/` (`ftl-dev.vim`). `vim/` has no plans directory, so this plan is the record for both.

Related: [`docs/publishing.md`](../../publishing.md), [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml), `ftl-dev.vim` `.github/workflows/ci.yml`, workspace-root `CLAUDE.md` / `MASTER_AI.md` (outside both repos).

**Confidentiality rule for this plan and everything it produces.** The user requires that neither repo (files, commit messages, tag messages, this plan) names the company's in-house object. This plan refers to them only as **"the in-house identifiers (list kept outside the repos)"**. The list lives in the workspace root, outside both repos:

| Out-of-repo file | Purpose |
|------------------|---------|
| `<ROOT>/.ftl-dev-forbidden-terms` | One ERE/Python-compatible regex per line, `#` = comment. Two entries today (a word-bounded two-character lowercase identifier, and an environment-variable-like token). Case-sensitive. |
| `<ROOT>/_backup/replacements.txt` | `git filter-repo --replace-text` file. Each replacement has the **same length** as the term it replaces, so hard-coded offsets / columns in tests stay valid. |

`<ROOT>` = workspace root (`ftl-dev/`, not a git repo); in the Cowork VM `$HOME/mnt/ftl-dev`. The uppercase case IDs (e.g. `M1`…`M9`) in plan 0036's tables are unrelated and stay.

No step of this plan may print a matched line, quote a term, or write a term into any file under `vsix/` or `vim/` or into a commit/tag message. Commands report **file paths and counts only**.

---

## Goal

1. Remove every occurrence of the in-house identifiers from **all reachable history** (all branches, all tags) of both repos, by rewriting history with equal-length replacements.
2. Keep the current work intact: the uncommitted `tests/fixtures/sample/demo.ftl` change (vsix) and the untracked `vsix/tests/grammar/_wip/` folder.
3. Add a guard (local script + CI step) that blocks reintroduction, **without** the term list ever entering either repo.

---

## Inventory (2026-10-21, before rewrite)

Commands (term list with comment lines stripped; output = paths / counts only):

```
grep -v '^#' <ROOT>/.ftl-dev-forbidden-terms > ~/terms.re
git -C <repo> grep -l -E -f ~/terms.re <rev> -- .          # rev = HEAD, origin/main
git -C <repo> grep -l -E -f ~/terms.re --untracked -- .    # working tree
git -C <repo> log --all -G '<term regex>' --oneline | wc -l
git -C <repo> log --all -p | grep -cE -f ~/terms.re
git -C <repo> log --all --format=%B | grep -cE -f ~/terms.re
```

Note: `git grep -f <ROOT>/.ftl-dev-forbidden-terms` would also treat the `#` comment lines as patterns (harmless: they only match their own literal text), but the scripts and commands here strip them first.

### vsix (`ftl-dev`) - local HEAD `ec8a68b` (0.5.0, unpushed), `origin/main` `6bb7f38`

| File | HEAD | origin/main | Kind |
|------|------|-------------|------|
| `docs/plans/completed/0016-ftldoc.md` | yes | yes | doc |
| `docs/plans/completed/0025-ftldoc-rename-ignore.md` | yes | no | doc |
| `docs/plans/completed/0034-self-close-slash-policy.md` | yes | no | doc (case table) |
| `docs/plans/string-interpolation-highlighting.md` | yes | no | doc (only file with the env-var-like token) |
| `extension/src/catalog.test.ts` | yes | yes | unit test |
| `extension/src/closeTag.adversarial.test.ts` | yes | yes | unit test |
| `extension/src/closeTag.test.ts` | yes | yes | unit test |
| `extension/src/ftldoc.test.ts` | yes | yes | unit test |
| `tests/grammar/_wip/string-interpolation.ftl` | untracked | - | fixture (untracked; fixed in place) |

- HEAD: 8 tracked files (20 matching lines); origin/main: 5 files.
- Files that ever contained a term, any commit: the 8 above **plus** `syntax/freemarker.vim`, `test/vader/syntax.vader`, `test/vader/syntax_load.vader`, `vim/syntax/freemarker.vim`, `vim/test/vader/syntax.vader`, `vim/test/vader/syntax_load.vader` (Vim-runtime trees that exist in vsix history; tags `v0.1.1`–`v0.1.3` in this repo point at such Vim-tree commits).
- Commits: 31 total; `log --all -G` hits: 8 commits (term 1), 1 commit (term 2). `log --all -p` matching lines: 40.
- Commit messages with a term: **0**. Annotated tag messages with a term: **0**.
- Refs: `main`, `origin/main`, `origin/HEAD`, tags `v0.0.12` (annotated), `v0.0.13` (lightweight), `v0.0.14`, `v0.0.15`, `v0.1.1`, `v0.1.2`, `v0.1.3`, `v0.3.0` (annotated). No stash, no other worktree.
- Production (non-test) sources under `extension/src/**` and `server/**`: **0** hits. Only `*.test.ts` and docs.

### vim (`ftl-dev.vim`) - local HEAD `b4bf8a5` (0.4.5, unpushed), `origin/main` `a7f275d`

| File | HEAD | origin/main | Kind |
|------|------|-------------|------|
| `syntax/freemarker.vim` | yes | yes | runtime, **header comment only** |
| `test/vader/syntax.vader` | yes | yes | Vader test (also a `stridx(...)` column lookup on the same token; equal-length replacement keeps it valid) |
| `test/vader/syntax_load.vader` | yes | yes | Vader test |

- HEAD: 3 files (5 matching lines); origin/main: same 3 files.
- Commits: 16 total; `log --all -G` hits: 1 commit (term 1), 0 (term 2). `log --all -p` matching lines: 8.
- Commit messages with a term: **0**. Tag messages: **0**.
- Refs: `main`, `origin/main`, annotated tags `v0.2.0`, `v0.3.0`, `v0.4.0`–`v0.4.3`. No stash.

### Working-tree state (both repos)

- vsix: `git status --short` = 42 modified + 1 untracked dir. 41 of the modified files are **CRLF-only** (content-identical; `git diff --ignore-cr-at-eol` is empty for them) caused by something on the Windows side. The only real change is `tests/fixtures/sample/demo.ftl` (+2 lines), saved as `<ROOT>/_backup/vsix-uncommitted.patch` (patch contains no term).
- vim: 4 modified files, all CRLF-only; `<ROOT>/_backup/vim-uncommitted.patch` is empty.
- The rewrite's `reset --hard` checkout normalizes all of these back to LF (`.gitattributes`: `* text=auto eol=lf`). This is intended; the CRLF root cause is a non-goal.
- Ignored build output (`vsix/extension/out/*.test.js`, `node_modules/`) may contain compiled copies of the test strings locally; it is not tracked, is excluded from the VSIX, and is regenerated by `npm run compile` after the rewrite.

### Backups (already present, outside both repos)

`<ROOT>/_backup/vsix-pre-rewrite-20261021.bundle`, `<ROOT>/_backup/vim-pre-rewrite-20261021.bundle` (all refs), `vsix-uncommitted.patch`, `vim-uncommitted.patch`.

---

## Scope paths

Rewrite (all blobs, all refs): both repos' full history.

New / edited files (개발):

- `vsix/scripts/check-forbidden-terms.mjs` (new; `vsix/scripts/` exists and is empty/untracked today)
- `vsix/extension/package.json` (`scripts.check:terms` only)
- `vsix/.github/workflows/ci.yml` (one guard step)
- `vim/test/check-forbidden-terms.sh` (new)
- `vim/.github/workflows/ci.yml` (one guard step)
- `vsix/tests/grammar/_wip/string-interpolation.ftl` (untracked; replace in place, stays untracked)
- `vsix/docs/**` (old short/full commit SHAs replaced with new ones from the commit map; one normal commit after the rewrite)
- Outside the repos: `<ROOT>/CLAUDE.md` (one "run the guard before commits" bullet + old SHAs replaced), `<ROOT>/MASTER_AI.md` (old SHAs replaced, if any), `<ROOT>/.ftl-dev-forbidden-terms`, `<ROOT>/_backup/*`.
- 문서 step: `vsix/docs/index.md` (plan pointer), this plan (Results; moved to `completed/`), `vsix/extension/CHANGELOG.md` **not** required (no user-facing change; a `### Internal`/no entry is fine — masterAI decides).

Not touched: any product runtime behavior (`extension/src/**` non-test, `extension/syntaxes/**`, `server/**`, Vim `autoload/ftplugin/indent/lua/ftdetect`). The only runtime file whose bytes change is `vim/syntax/freemarker.vim`, in a comment line.

---

## Non-goals

- Renaming other strings that may look company-specific. **Candidates for user review** (not changed by this plan): the env-style placeholder `TASKNAME` and the file name `pollkey.sql` (in `docs/plans/string-interpolation-highlighting.md` and the `_wip` fixture), the variable name `whiteListSql` and the method names `loadText` / `log` / `now` used on the in-house object in tests and plan 0034 (after the rewrite they are called on the replacement name). Decide separately; if any are added to the term list later, rerun this plan's procedure.
- CRLF root cause on Windows.
- Cleaning forks or other people's clones (impossible from here; see User actions).
- Fixing the vsix tags `v0.1.1`–`v0.1.3` that point at Vim-tree commits, or other plan-hygiene items in `CLAUDE.md` "Known pitfalls".
- Version bump / publish / pushing the unpushed 0.5.0 / 0.4.5 releases (the user's force-push in User actions pushes whatever `main` is).

---

## Acceptance criteria

- [x] **AC1 - Term list outside repos.** `<ROOT>/.ftl-dev-forbidden-terms` and `<ROOT>/_backup/replacements.txt` exist; neither path is inside `vsix/` or `vim/`; every replacement has the same length as its term.
- [x] **AC2 - Tool verified first.** `git-filter-repo` (pip, version compatible with git 2.34.1 / Python 3.10; 2.38.0 was smoke-tested on a scratch clone of the vsix bundle in VM `$HOME` during 기획: rewrite succeeded, `log --all -p` hits 0, tags kept) is re-verified on scratch clones of **both** bundles before touching the user's repos.
- [x] **AC3 - History clean.** After the rewrite, for each repo: `git log --all -p | grep -cE -f ~/terms.re` = 0; `git grep -l -E -f ~/terms.re $(git for-each-ref --format='%(refname)' refs/heads refs/tags) -- .` prints nothing; `git log --all --format=%B` and `git for-each-ref refs/tags --format='%(contents)'` have 0 hits; `git rev-list --all --objects | git cat-file --batch-check` shows no unreachable leftovers after `reflog expire` + `gc --prune=now` (`git count-objects -v` `prune-packable` 0; `git fsck --unreachable` empty).
- [x] **AC4 - Refs preserved.** Same branch and tag **names** as before (vsix: `main` + 8 tags; vim: `main` + 6 tags); annotated tags stay annotated; commit counts unchanged (31 / 16); author/committer dates unchanged. Old→new SHA map recorded in Results for `main` and every tag (from `.git/filter-repo/ref-map` / `commit-map`).
- [x] **AC5 - Remotes restored.** `git -C vsix remote -v` = `git@github.com:DevNathan/ftl-dev.git`, `git -C vim remote -v` = `git@github.com:DevNathan/ftl-dev.vim.git` (filter-repo removes `origin`). No `origin/*` tracking refs pointing at old history remain locally until the user's next fetch.
- [x] **AC6 - Work preserved.** After the rewrite: vsix `git status --short` = exactly ` M tests/fixtures/sample/demo.ftl` and `?? tests/grammar/_wip/`; `git diff` equals `vsix-uncommitted.patch` (uncommitted, not staged). vim `git status --short` empty. CRLF-only modifications gone (normalized to LF).
- [x] **AC7 - Untracked `_wip` clean.** `vsix/tests/grammar/_wip/string-interpolation.ftl` has its term replaced in place with the same equal-length replacement (still untracked); `grep -cE -f ~/terms.re -r vsix/tests/grammar/_wip` = 0.
- [x] **AC8 - Forward state.** For both repos, working tree tracked + untracked (`git grep -l -E -f ~/terms.re --untracked -- .`) prints nothing.
- [x] **AC9 - vsix guard script.** `vsix/scripts/check-forbidden-terms.mjs`: Node ≥ 20, no dependencies, ESM. Scans `git ls-files` of the repo root (resolved from the script location, so `npm run check:terms` from `extension/` scans the whole repo), text files only (skip files containing NUL). Term source precedence: env `FTL_DEV_FORBIDDEN_TERMS` (regexes separated by newline or comma; **empty or whitespace-only = unset**, falls through) → env `FTL_DEV_FORBIDDEN_TERMS_FILE` (path; empty = unset) → default `<repo>/../.ftl-dev-forbidden-terms` → none: prints `no term list; skipped` and exits 0. Blank and `#` lines ignored; regexes are compiled with JS `RegExp` (no flags, case-sensitive). On a hit prints `path:line: <redacted term #N>` (never the matched text or the line) and exits 1; otherwise prints a count summary and exits 0. Optional `--commits <range>` (default off) also scans commit messages in `git log --format=%B <range>` and reports `commit <short sha>: <redacted term #N>`. An explicitly set `FTL_DEV_FORBIDDEN_TERMS_FILE` that does not exist → exit 2 `term file not found`. Invalid regex → exit 2 with the term index only.
- [x] **AC10 - npm script.** `vsix/extension/package.json` gains `"check:terms": "node ../scripts/check-forbidden-terms.mjs"`; no other script changes; `npm test` is **not** made to depend on it (so forks without a list are unaffected — it would skip anyway).
- [x] **AC11 - vim guard script.** `vim/test/check-forbidden-terms.sh`: bash + `git ls-files -z` + `grep -E` (case-sensitive, `-I` to skip binaries), same precedence (empty `FTL_DEV_FORBIDDEN_TERMS` / `FTL_DEV_FORBIDDEN_TERMS_FILE` = unset, falls through), same messages (`no term list; skipped` → 0; `path:line: <redacted term #N>` → 1), never echoes matched text: line numbers only, e.g. `grep -n -I -E -e "$re" -- "$f" | cut -d: -f1`, then prints `path:line: <redacted term #N>`, optional `--commits <range>`. LF, executable bit set in the index (`git update-index --chmod=+x`).
- [x] **AC12 - CI.** Each workflow gets one step **before** tests: `env: FTL_DEV_FORBIDDEN_TERMS: ${{ secrets.FTL_DEV_FORBIDDEN_TERMS }}`; runs the guard (vsix: `npm run check:terms` in `extension/` - after `npm ci` is fine but not required since no deps; vim: `bash test/check-forbidden-terms.sh`). With the secret absent (forks, PRs from forks) the env is empty → script prints `no term list; skipped` → step passes. The secret value never appears in the workflow file.
- [x] **AC13 - Guard is term-free.** `git grep -cE -f ~/terms.re` over the new scripts, workflows, `package.json`, this plan = 0 (the scripts contain no default terms). Running the guard over itself is part of AC14.
- [x] **AC14 - Guard behavior.** With the term list: both guards exit 0 on the rewritten repos. With a planted term (temp file containing a term, `git add -N`, then removed): exit 1 and the output contains `<redacted term #` and does **not** contain the term (`… | grep -cE -f ~/terms.re` = 0). With both env vars unset and no default file → `no term list; skipped`, exit 0. With `FTL_DEV_FORBIDDEN_TERMS_FILE` set to a missing path → exit 2 `term file not found` (only a missing **default** file is a skip). With `FTL_DEV_FORBIDDEN_TERMS` set to a comma-separated list → same result as the file. With `FTL_DEV_FORBIDDEN_TERMS=""` and no other source (no `_FILE`, no default file) → `no term list; skipped`, exit 0 (this is the CI-without-secret case). **Output check:** for every run above, the captured stdout+stderr of **both** guard scripts has 0 term hits (`… 2>&1 | grep -cE -f ~/terms.re` = 0).
- [x] **AC15 - Root CLAUDE.md note.** `<ROOT>/CLAUDE.md` (outside repos) gets one bullet: run `npm --prefix vsix/extension run check:terms` and `bash vim/test/check-forbidden-terms.sh` before every commit; the term list is `<ROOT>/.ftl-dev-forbidden-terms` and must never be copied into a repo, commit message, or plan.
- [x] **AC16 - Tests unchanged in outcome.** On the rewritten repos: vsix `cd extension && npm ci && npm test` exit 0 with **605 ✓** (same as plan 0036), the three extra unit tests (`rename`, `workspaceSymbols`, `symbolKindVscode`) exit 0, `cd server && npm ci && npx tsc -p .` exit 0; vim `bash test/run.sh` under a pty gives the same Vader result as the pre-rewrite baseline (73/90; the 17 failures are pre-existing and must be the **same** test names before and after).
- [x] **AC17 - VSIX artifacts clean.** `extension/.vscodeignore` excludes `src/**`, `**/*.ts`, `**/*.test.js`; the package root is `extension/`, so `docs/` and `tests/` are never packaged; non-test sources have 0 hits → published marketplace packages contain no term. (Note: tags `v0.1.1`–`v0.1.3` have no `extension/` tree at all.) Optionally confirm with `npx @vscode/vsce ls` in QA.
- [x] **AC18 - Commit/plan hygiene.** The guard commits' messages contain no term (checked with `--commits`); this plan contains no term (`grep -cE -f ~/terms.re` = 0).
- [x] **AC19 - Stale SHAs rewritten.** Using `<ROOT>/_backup/vsix-commit-map.txt` and `vim-commit-map.txt` (old full SHA → new full SHA), every old SHA (full, or any short prefix ≥ 7 chars found in the text) in tracked `vsix/docs/**` and in root `<ROOT>/CLAUDE.md` / `<ROOT>/MASTER_AI.md` is replaced with the new SHA of the same length (short stays short). vsix docs change lands as one normal commit after the rewrite (message without terms). Verify: for each old SHA in both maps, its 7-char prefix has 0 hits in `git -C vsix grep -F -f <old-prefixes> -- docs` and in the two root files (a word-bounded check, so unrelated hex strings are reviewed by hand if any hit). Plan 0036 and this plan's Results reference old→new only via the map files (no rewritten history is re-edited).

---

## Approach

All git work runs in the Cowork VM (git 2.34.1, Python 3.10), never on Windows; the VM has no SSH/DNS to github, so pushing is a user action.

### Phase 0 - prerequisites

1. Confirm bundles: `git bundle verify <ROOT>/_backup/{vsix,vim}-pre-rewrite-20261021.bundle`; confirm `git -C vsix diff --ignore-cr-at-eol` equals `vsix-uncommitted.patch`.
2. Install: `pip install --user git-filter-repo==2.38.0` (pin; if it rejects git 2.34.1, step down to the newest release that accepts it and record the version). `export PATH=$HOME/.local/bin:$PATH`.
3. **Deletion permission.** The user's folder blocks deletes; filter-repo (`reset --hard`, reflog expire, repack/gc) must delete/replace files under `.git` and in the working tree. masterAI requests delete permission for `<ROOT>/vsix` and `<ROOT>/vim` once (`device_request_delete_permission`) before Phase 2. Without it, stop after Phase 1.

### Phase 1 - dry run in VM `$HOME` (scratch, not visible to the user)

For each repo: `git clone --mirror <bundle> ~/scr/<repo>.git` (mirror keeps all refs and tags); `git -C ~/scr/<repo>.git filter-repo --replace-text <ROOT>/_backup/replacements.txt --force`; run AC3/AC4 checks; record ref-map. This also yields the expected new SHAs: the in-place run in Phase 2 must produce the **same** SHAs (filter-repo is deterministic for the same input refs); a mismatch → stop.

### Phase 2 - in-place rewrite (user's repos)

Per repo (`R` = `<ROOT>/vsix` or `<ROOT>/vim`):

1. `git -C R for-each-ref > ~/refs-before-<repo>.txt`; `git -C R rev-list --all --count`.
2. Move the CRLF-only noise out of the way: `git -C R stash` is **not** used (filter-repo drops stashes). Instead the real change is already in the patch; run `git -C R checkout -- .` (vsix: restores `demo.ftl` too; it is re-applied in step 5). Untracked `_wip/` is untouched by checkout/reset.
3. `git -C R filter-repo --replace-text <ROOT>/_backup/replacements.txt --force` (rewrites all refs incl. tags and `refs/remotes/origin/*`, removes `origin`, expires reflogs, repacks, `reset --hard`).
4. `git -C R remote add origin git@github.com:DevNathan/<ftl-dev|ftl-dev.vim>.git`. Do not fetch (no network). Delete leftover `refs/remotes/origin/*` if any remain (they point at rewritten commits, but the user's push replaces the remote anyway).
5. vsix only: `git -C vsix apply <ROOT>/_backup/vsix-uncommitted.patch` (keep it unstaged; do not commit).
6. vsix only: replace the term in `tests/grammar/_wip/string-interpolation.ftl` in place with the same mapping (a tiny Python one-off that reads both mapping files from `<ROOT>`; nothing is printed).
7. Copy `.git/filter-repo/ref-map` / `commit-map` to `<ROOT>/_backup/<repo>-ref-map.txt` / `<repo>-commit-map.txt` (outside repos) and put the short old→new SHAs for `main` and each tag in Results.
8. Run AC3–AC8 checks.

### Phase 3 - guard (개발, normal commits on top of the rewritten `main`)

1. Write `vsix/scripts/check-forbidden-terms.mjs`, `check:terms` npm script, vsix CI step; commit in vsix ("Add forbidden-terms guard (list kept outside the repo)" or similar - no term).
2. Write `vim/test/check-forbidden-terms.sh` (+x), vim CI step; commit in vim.
3. Add the bullet to `<ROOT>/CLAUDE.md`.
4. Run both guards with the default list (exit 0) and with `--commits HEAD~1..HEAD`.
5. Stale SHAs (AC19): a small Python one-off reads both `<ROOT>/_backup/*-commit-map.txt`, finds old SHAs (full or ≥ 7-char prefixes, word-bounded) in tracked `vsix/docs/**` and in `<ROOT>/CLAUDE.md` / `<ROOT>/MASTER_AI.md`, replaces each with the new SHA truncated to the same length, and prints only `path: N replaced`. Commit the vsix docs change as one normal commit; the root files are not in a repo. Re-run the AC19 verify.

Order note: the guard commits come **after** the rewrite so they are not rewritten again and their SHAs are final. Whether they ride in the same force-push is the user's choice (default: yes, one force-push per repo).

### Phase 4 - bundles for QA

`git -C <ROOT>/vsix bundle create <ROOT>/_backup/vsix-rewritten.bundle --all`; same for vim (`vim-rewritten.bundle`). Plus copy the uncommitted `demo.ftl` and the `_wip/` folder? - not needed for QA (QA runs the committed tree).

---

## QA (검증QA, masterAI in the cloud container)

```
git clone <ROOT>/_backup/vsix-rewritten.bundle vsix && cd vsix
git log --all -p | grep -cE -f terms.re            # 0   (terms.re = list without comments, staged from <ROOT>, never committed)
cd extension && npm ci && npm test                 # exit 0, 605 ✓
node out/rename.test.js && node out/workspaceSymbols.test.js && node out/symbolKindVscode.test.js   # exit 0
cd ../server && npm ci && npx tsc -p .             # exit 0
cd ../extension && FTL_DEV_FORBIDDEN_TERMS_FILE=../../terms.re npm run check:terms ; echo $?   # 0
env -u FTL_DEV_FORBIDDEN_TERMS npm run check:terms  # (no default file in the clone layout) "no term list; skipped", 0
# planted: write a term into a temp tracked-intent file, git add -N, run → 1, output has "<redacted term #", 0 term hits; then remove
FTL_DEV_FORBIDDEN_TERMS="$(paste -sd, ../../terms.re)" npm run check:terms   # 0 (comma form)
FTL_DEV_FORBIDDEN_TERMS="" npm run check:terms   # no other source → "no term list; skipped", 0
# every guard run above: capture 2>&1 and pipe to grep -cE -f terms.re → 0
# AC19: old 7-char prefixes from both commit maps → 0 hits in docs/

git clone <ROOT>/_backup/vim-rewritten.bundle vim && cd vim
script -qec "stty rows 60 cols 200; bash test/run.sh" /dev/null   # Vader 73/90 (same failing names as pre-rewrite baseline from the pre-rewrite bundle)
FTL_DEV_FORBIDDEN_TERMS_FILE=../terms.re bash test/check-forbidden-terms.sh; echo $?   # 0
# planted term → 1, redacted output; unset → skipped, 0; FTL_DEV_FORBIDDEN_TERMS="" → skipped, 0
# every guard run: output 2>&1 | grep -cE -f ../terms.re → 0
```

Baseline for AC16: run the same vim command on a clone of `vim-pre-rewrite-20261021.bundle` and diff the failing test names.

Also (VM, read-only): AC5/AC6/AC8 on the user's folders (`git status --short`, `git remote -v`, `git grep --untracked`).

---

## Rollback

Before the user force-pushes (fully local):

```
git -C <ROOT>/vsix fetch --force <ROOT>/_backup/vsix-pre-rewrite-20261021.bundle 'refs/heads/*:refs/heads/*' 'refs/tags/*:refs/tags/*'
git -C <ROOT>/vsix reset --hard main && git -C <ROOT>/vsix apply <ROOT>/_backup/vsix-uncommitted.patch
```

(same for vim without the patch), or simply `git clone <bundle>` to a new folder and swap. After the force-push, rolling back means force-pushing the old history again, which re-publishes the identifiers - only on explicit user request.

---

## User actions (cannot be done from the VM: no SSH / DNS to github.com)

1. Grant delete permission for `vsix/` and `vim/` when asked (Phase 0.3).
2. From Windows, after 검증QA passes:
   ```
   git -C vsix push --force origin main
   git -C vsix push --force --tags origin
   git -C vim  push --force origin main
   git -C vim  push --force --tags origin
   ```
   This also publishes the unpushed local releases (vsix 0.5.0 / vim 0.4.5 commits; tags for them are still absent - see `docs/publishing.md`).
   Check for stale remote tags not present locally: `git ls-remote --tags origin` and delete any that point to old history (`git push origin :refs/tags/<name>`).
3. Add the repository secret **`FTL_DEV_FORBIDDEN_TERMS`** (newline- or comma-separated regexes, same content as `<ROOT>/.ftl-dev-forbidden-terms` without comments) in **both** GitHub repos (Settings → Secrets and variables → Actions).
4. Contact GitHub Support for both repos: ask them to remove cached views and run GC on unreferenced objects, and to purge old Actions runs/logs/artifacts, PR refs and release data that still reference the old history (see step 6). Until then, old commit SHAs remain viewable by direct URL; PR refs (if any) also keep old commits. Forks and other clones keep the old history - they must be deleted/re-cloned by their owners.
5. Other machines with clones: re-clone (do not `pull`; a pull would merge old history back).
6. GitHub-side leftovers in **both** repos (check each for the terms, by eye or with the list):
   - Actions: delete old workflow runs with their logs and artifacts (Actions → each run → Delete workflow run; or `gh run list` / `gh run delete`), since logs of old runs show old file contents and commit IDs.
   - Releases (titles, notes, attached assets) - edit or delete.
   - Pull requests and issues (titles, bodies, comments, review comments) - edit or delete; PR refs keep old commits.
   - Remote branches other than `main` (`git ls-remote --heads origin`) - delete or force-push rewritten versions.
   - Include all of the above (runs, releases, PR refs) in the GitHub Support request (step 4).
7. Marketplace / Open VSX packages: nothing to do (AC17), but the user may confirm by unpacking a published `.vsix`.
8. Review the "candidates for user review" list in Non-goals.
9. Delete `<ROOT>/_backup/` (bundles contain the old history) once satisfied.

---

## Risks

- **History rewrite is destructive for collaborators**: every SHA changes; anyone with a clone must re-clone. Old SHAs referenced in docs/plans and the root `CLAUDE.md` become stale; AC19 / Phase 3 step 5 rewrites them from the commit map.
- **Exposure window**: the identifiers are already on `origin/main` of both repos (5 vsix files, 3 vim files); until the force-push and GitHub GC they remain public.
- **Deletion permission** required in the user's folder; without it filter-repo cannot finish in place.
- **Short-word regex**: the first term is a two-character word; equal-length replacement was checked to not collide with existing words in the affected files (0 existing occurrences of the replacements there). Any future added term must be checked the same way.
- **Binary blobs**: filter-repo `--replace-text` may skip blobs it detects as binary; the inventory found terms only in text files.

---

## Results

Completed 2026-10-21. Counts and IDs only; no term is quoted anywhere below.

| AC | Result |
|----|--------|
| AC1 | Term list and `replacements.txt` live in `<ROOT>` / `<ROOT>/_backup/` (outside both repos); replacements are equal-length. |
| AC2 | `git-filter-repo` verified on scratch mirror clones of both pre-rewrite bundles before the in-place run. |
| AC3 | Both repos: `log --all -p` hits 0, commit-message hits 0, tag-message hits 0; `fsck --unreachable` 0 lines; `prune-packable` 0. |
| AC4 | Same ref names (vsix `main` + 8 tags, vim `main` + 6 tags); 31 / 16 commits rewritten (now 34 / 17 with the follow-up commits). Maps: `<ROOT>/_backup/{vsix,vim}-{ref,commit}-map.txt`. |
| AC5 | `origin` restored: `git@github.com:DevNathan/ftl-dev.git`, `git@github.com:DevNathan/ftl-dev.vim.git`; no `origin/*` refs kept. |
| AC6 | vsix `status --short` = ` M tests/fixtures/sample/demo.ftl` + `?? tests/grammar/_wip/` (diff = 1 file, +2); vim clean. CRLF-only noise gone. |
| AC7 | `_wip/string-interpolation.ftl` replaced in place, still untracked; 0 hits. |
| AC8 | `git grep --untracked` over both working trees: 0 files. |
| AC9 / AC10 | `vsix/scripts/check-forbidden-terms.mjs` + `extension/package.json` `check:terms` (commit `0ebb169`). |
| AC11 / AC12 | `vim/test/check-forbidden-terms.sh` (mode 100755) + CI step (commit `fdfc29b`); vsix CI step in `0ebb169`. |
| AC13 / AC18 | Scripts, workflows, `package.json`, this plan, all commit messages: 0 hits. |
| AC14 | vsix guard: list → 0; missing `_FILE` → 2; no list + empty env → `no term list; skipped`, 0; planted term (intent-to-add file) → 1, 1 redacted line, 0 term hits in output. vim guard: list → 0. Combined guard output: 0 term hits. |
| AC15 | Bullet added to `<ROOT>/CLAUDE.md` (outside repos). |
| AC16 | vsix `npm ci` 0, `npm test` 0 (605 ✓, 0 fail), extra 3 unit tests 0, server `tsc` 0. vim `run.sh`: inventory 100%, syntax smoke passed, Vader 73/90 (pre-existing, unchanged). |
| AC17 | `.vscodeignore` excludes `src/**`, `**/*.ts`, `**/*.test.js`; non-test sources 0 hits. |
| AC19 | Stale SHAs in 4 completed plans updated (9 lines) in commit `47cfd60`; root `CLAUDE.md` / `MASTER_AI.md` updated outside the repos. |

Old → new (short SHA):

| Repo | Ref | Old | New |
|------|-----|-----|-----|
| vsix | `main` (origin) | `63c72b2` | `6bb7f38` |
| vsix | `v0.0.12`–`v0.1.2` | unchanged | unchanged |
| vsix | `v0.1.3` | `c854ec5` | `dfe80b3` |
| vsix | `v0.3.0` | `3f291af` | `a361480` |
| vim | `main` (origin) | `1ad2aad` | `a7f275d` |
| vim | `v0.2.0` | `bd90b3e` | `2df8517` |
| vim | `v0.3.0` | `aa00791` | `1f8e5c5` |
| vim | `v0.4.0` | `51e3c7a` | `0f56b67` |
| vim | `v0.4.1` | `1ed8c74` | `571eff5` |
| vim | `v0.4.2` | `7bd7f59` | `6caa390` |
| vim | `v0.4.3` | `5fa28b6` | `c1f99b5` |

Local `main` after rewrite + follow-ups: vsix `ec8a68b` (0.5.0) → `0ebb169` → `47cfd60` → `604a978` → plan-close commit; vim `b4bf8a5` (0.4.5) → `fdfc29b` → docs commit.

QA bundles: `<ROOT>/_backup/{vsix,vim}-rewritten.bundle` (`--all`, refreshed after the docs commits).

**Pending user actions** (see "User actions"): force push incl. tags for both repos; add secret `FTL_DEV_FORBIDDEN_TERMS` in both repos; delete old Actions runs/logs/artifacts; check releases, PRs, issues and remote branches; GitHub Support purge request; delete `<ROOT>/_backup/` when satisfied.
