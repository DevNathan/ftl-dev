#!/usr/bin/env node
// Blocks reintroduction of terms that must not appear in this repository.
//
// The term list is NOT stored in the repo. Sources, first non-empty wins:
//   1. env FTL_DEV_FORBIDDEN_TERMS       regexes separated by newline or comma
//   2. env FTL_DEV_FORBIDDEN_TERMS_FILE  path to a file, one regex per line
//   3. <repo>/../.ftl-dev-forbidden-terms (workspace root, outside the repo)
//   4. none -> "no term list; skipped", exit 0
// Blank lines and lines starting with '#' are ignored. Regexes are JS RegExp,
// case-sensitive, no flags.
//
// Scans `git ls-files` (text files only). Output never contains the matched
// text or the line: hits are reported as `path:line: <redacted term #N>`.
// Option `--commits <range>` also scans commit messages of `git log <range>`.
//
// Exit codes: 0 clean or skipped, 1 hits found, 2 usage / config error.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_FILE = resolve(REPO_ROOT, "..", ".ftl-dev-forbidden-terms");

function fail(msg) {
  console.error(`check-forbidden-terms: ${msg}`);
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { commits: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--commits") {
      if (i + 1 >= argv.length) fail("--commits needs a revision range");
      opts.commits = argv[++i];
    } else if (a.startsWith("--commits=")) {
      opts.commits = a.slice("--commits=".length);
      if (!opts.commits) fail("--commits needs a revision range");
    } else if (a === "-h" || a === "--help") {
      console.log("usage: check-forbidden-terms.mjs [--commits <range>]");
      process.exit(0);
    } else {
      fail(`unknown argument: ${a}`);
    }
  }
  return opts;
}

function splitTerms(text, allowComma) {
  return text
    .split(allowComma ? /[\r\n,]+/ : /\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== "" && !s.startsWith("#"));
}

function loadTerms() {
  const envList = process.env.FTL_DEV_FORBIDDEN_TERMS;
  if (envList !== undefined && envList.trim() !== "") {
    return { terms: splitTerms(envList, true), source: "env FTL_DEV_FORBIDDEN_TERMS" };
  }
  const envFile = process.env.FTL_DEV_FORBIDDEN_TERMS_FILE;
  if (envFile !== undefined && envFile.trim() !== "") {
    if (!existsSync(envFile)) fail("term file not found");
    return { terms: splitTerms(readFileSync(envFile, "utf8"), false), source: "env FTL_DEV_FORBIDDEN_TERMS_FILE" };
  }
  if (existsSync(DEFAULT_FILE)) {
    return { terms: splitTerms(readFileSync(DEFAULT_FILE, "utf8"), false), source: "default term file" };
  }
  return null;
}

function compile(terms) {
  return terms.map((t, i) => {
    try {
      return new RegExp(t);
    } catch {
      fail(`invalid regex: term #${i + 1}`);
    }
  });
}

function git(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

const opts = parseArgs(process.argv.slice(2));
const loaded = loadTerms();
if (!loaded || loaded.terms.length === 0) {
  console.log("no term list; skipped");
  process.exit(0);
}
const regexes = compile(loaded.terms);

let hits = 0;
let scanned = 0;
const files = git(["ls-files", "-z"]).split("\0").filter(Boolean);
for (const rel of files) {
  const abs = join(REPO_ROOT, rel);
  let buf;
  try {
    if (!statSync(abs).isFile()) continue;
    buf = readFileSync(abs);
  } catch {
    continue; // deleted in the working tree, or unreadable
  }
  if (buf.includes(0)) continue; // binary
  scanned++;
  const lines = buf.toString("utf8").split("\n");
  for (let ln = 0; ln < lines.length; ln++) {
    for (let t = 0; t < regexes.length; t++) {
      if (regexes[t].test(lines[ln])) {
        console.log(`${rel}:${ln + 1}: <redacted term #${t + 1}>`);
        hits++;
      }
    }
  }
}

let commitsScanned = 0;
if (opts.commits) {
  let out;
  try {
    out = git(["log", "--format=%h%x00%B%x1e", opts.commits]);
  } catch {
    fail("git log failed for the given --commits range");
  }
  for (const rec of out.split("\x1e")) {
    const nul = rec.indexOf("\0");
    if (nul < 0) continue;
    const sha = rec.slice(0, nul).trim();
    const msg = rec.slice(nul + 1);
    commitsScanned++;
    for (let t = 0; t < regexes.length; t++) {
      if (msg.split("\n").some((l) => regexes[t].test(l))) {
        console.log(`commit ${sha}: <redacted term #${t + 1}>`);
        hits++;
      }
    }
  }
}

const summary =
  `${scanned} file(s)` + (opts.commits ? `, ${commitsScanned} commit message(s)` : "") +
  `, ${regexes.length} term(s) from ${loaded.source}`;
if (hits > 0) {
  console.log(`check-forbidden-terms: ${hits} hit(s) in ${summary}`);
  process.exit(1);
}
console.log(`check-forbidden-terms: ok, 0 hits in ${summary}`);
