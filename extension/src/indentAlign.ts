/**
 * Align mid-block / close-tag lines to their opener indent when `>` or `]` is typed.
 *
 * VS Code `decreaseIndentPattern` alone is unreliable for `#elseif` / `#else` typed
 * on an already-indented body line; this on-type rewrite matches closeTag's approach.
 */

import { lineIndentAt, OpenSite } from "./closeTag";
import { BLOCK_OPEN, CAPTURE_ASSIGN, MID_BLOCK } from "./indentRules";
import { escapeRe } from "./scan";

const MID_ALIGN_RE_CACHE = new Map<string, RegExp>();
const CLOSE_ALIGN_RE_CACHE = new Map<string, RegExp>();

function midAlignRe(openBracket: string, closer: string): RegExp {
  const key = `${openBracket}${closer}`;
  let re = MID_ALIGN_RE_CACHE.get(key);
  if (!re) {
    re = new RegExp(
      `^${escapeRe(openBracket)}#(${MID_BLOCK})\\b[\\s\\S]*${escapeRe(closer)}$`
    );
    MID_ALIGN_RE_CACHE.set(key, re);
  }
  return re;
}

function closeAlignRe(openBracket: string, closer: string): RegExp {
  const key = `${openBracket}${closer}`;
  let re = CLOSE_ALIGN_RE_CACHE.get(key);
  if (!re) {
    re = new RegExp(
      `^${escapeRe(openBracket)}/(#|@)([a-zA-Z_][\\w.]*)\\b[\\s\\S]*${escapeRe(closer)}$`
    );
    CLOSE_ALIGN_RE_CACHE.set(key, re);
  }
  return re;
}

export type IndentAlignEdit = {
  replace: { start: number; end: number; text: string };
  cursorAt: number;
};

const MID_NAMES = new Set(MID_BLOCK.split("|"));
const BLOCK_NAMES = new Set(BLOCK_OPEN.split("|"));
const CAPTURE_NAMES = new Set(CAPTURE_ASSIGN.split("|"));

const ELSE_PARENTS = new Set(["if", "list"]);
const ELSEIF_PARENTS = new Set(["if"]);
const RECOVER_PARENTS = new Set(["attempt"]);
const CASE_PARENTS = new Set(["switch"]);
const SEP_PARENTS = new Set(["list", "items"]);

/**
 * After the user typed `>` or `]` at `offset` (position after the closer),
 * rewrite the line indent to match the controlling opener when needed.
 */
export function alignIndentAfterCloser(
  text: string,
  offset: number
): IndentAlignEdit | undefined {
  if (offset < 1) {
    return undefined;
  }
  const closer = text[offset - 1];
  if (closer !== ">" && closer !== "]") {
    return undefined;
  }
  const openBracket = closer === ">" ? "<" : "[";

  const line = lineIndentAt(text, offset - 1);
  // Tag text ends at the closer we just typed. Trailing same-line content
  // (e.g. `  <#recover>|</#attempt>` after HTML-style pair) must not block align.
  const content = text.slice(line.contentStart, offset);
  const mid = content.match(midAlignRe(openBracket, closer));
  if (mid) {
    const name = mid[1]!;
    const parent = findMidBlockParent(
      text.slice(0, line.lineStart),
      name,
      openBracket
    );
    return alignTo(line, offset, parent?.indent);
  }

  const close = content.match(closeAlignRe(openBracket, closer));
  if (close) {
    const sigil = close[1]!;
    const name = close[2]!;
    const parent = findMatchingOpen(
      text.slice(0, line.lineStart),
      `${sigil}${name}`,
      openBracket
    );
    return alignTo(line, offset, parent?.indent);
  }

  return undefined;
}

function alignTo(
  line: { lineStart: number; contentStart: number; indent: string },
  offset: number,
  wantIndent: string | undefined
): IndentAlignEdit | undefined {
  if (wantIndent === undefined || wantIndent === line.indent) {
    return undefined;
  }
  const delta = wantIndent.length - line.indent.length;
  return {
    replace: {
      start: line.lineStart,
      end: line.contentStart,
      text: wantIndent,
    },
    cursorAt: offset + delta,
  };
}

function findMidBlockParent(
  textBefore: string,
  midName: string,
  openBracket: string
): OpenSite | undefined {
  let parents: Set<string>;
  switch (midName) {
    case "elseif":
      parents = ELSEIF_PARENTS;
      break;
    case "else":
      parents = ELSE_PARENTS;
      break;
    case "recover":
      parents = RECOVER_PARENTS;
      break;
    case "case":
    case "on":
    case "default":
      parents = CASE_PARENTS;
      break;
    case "sep":
      parents = SEP_PARENTS;
      break;
    default:
      return undefined;
  }

  const stack = collectOpenStack(textBefore, openBracket);
  for (let i = stack.length - 1; i >= 0; i--) {
    const site = stack[i]!;
    if (!site.name.startsWith("#")) {
      continue;
    }
    const dir = site.name.slice(1);
    if (parents.has(dir)) {
      return site;
    }
  }
  return undefined;
}

function findMatchingOpen(
  textBefore: string,
  key: string,
  openBracket: string
): OpenSite | undefined {
  const stack = collectOpenStack(textBefore, openBracket);
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]!.name === key) {
      return stack[i];
    }
  }
  return undefined;
}

/**
 * Still-open block directives (same bracket style). Mid-block markers do not
 * push/pop. Tag ends are found with string + paren depth so `<#if (x > y)>`
 * is recognized.
 */
function collectOpenStack(textBefore: string, openBracket: string): OpenSite[] {
  const closeBracket = openBracket === "<" ? ">" : "]";
  const stack: OpenSite[] = [];

  let i = 0;
  while (i < textBefore.length) {
    const start = textBefore.indexOf(openBracket, i);
    if (start === -1) {
      break;
    }
    let p = start + 1;
    let isClose = false;
    if (textBefore[p] === "/") {
      isClose = true;
      p++;
    }
    const sigil = textBefore[p];
    if (sigil !== "#" && sigil !== "@") {
      i = start + 1;
      continue;
    }
    p++;
    if (!/[a-zA-Z_]/.test(textBefore[p] ?? "")) {
      i = start + 1;
      continue;
    }
    const nameStart = p;
    p++;
    while (p < textBefore.length && /[\w.]/.test(textBefore[p]!)) {
      p++;
    }
    const name = textBefore.slice(nameStart, p);
    const innerStart = p;
    const end = scanTagEnd(textBefore, p, closeBracket);
    if (end === -1) {
      break;
    }
    const inner = textBefore.slice(innerStart, end);
    i = end + 1;

    const selfClose = /\/\s*$/.test(inner);
    const key = `${sigil}${name}`;
    if (selfClose) {
      continue;
    }
    if (sigil === "#" && MID_NAMES.has(name)) {
      continue;
    }
    if (isClose) {
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s]!.name === key) {
          stack.splice(s, 1);
          break;
        }
      }
      continue;
    }
    if (!isBlockOpen(sigil, name, inner)) {
      continue;
    }
    const { indent } = lineIndentAt(textBefore, start);
    stack.push({ name: key, indent, offset: start });
  }

  return stack;
}

/** Index of closing `>` / `]`, or -1. Honors quotes and `()` nesting. */
function scanTagEnd(
  text: string,
  from: number,
  closeBracket: string
): number {
  let inStr: '"' | "'" | null = null;
  let paren = 0;
  for (let p = from; p < text.length; p++) {
    const ch = text[p]!;
    if (inStr) {
      if (ch === "\\" && p + 1 < text.length) {
        p++;
        continue;
      }
      if (ch === inStr) {
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === "(") {
      paren++;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren--;
      continue;
    }
    if (ch === closeBracket && paren === 0) {
      return p;
    }
  }
  return -1;
}

function isBlockOpen(sigil: string, name: string, inner: string): boolean {
  if (sigil === "@") {
    return true;
  }
  if (BLOCK_NAMES.has(name)) {
    return true;
  }
  if (!CAPTURE_NAMES.has(name)) {
    return false;
  }
  const body = inner.replace(/\/\s*$/, "").trim();
  return !/(=|\+\+|--|\+=|-=|\*=|\/=|%=)/.test(body);
}

/** Apply an IndentAlignEdit to a string (for tests). */
export function applyIndentAlignEdit(
  text: string,
  edit: IndentAlignEdit
): string {
  const { start, end, text: t } = edit.replace;
  return text.slice(0, start) + t + text.slice(end);
}
