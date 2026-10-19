import { skipFtlComment } from "./comments";
import { escapeRe } from "./scan";

export type CloseEdit = {
  /**
   * Replace [start, end) with `text` (preferred for `</` → full close tag).
   * When set, insertAt/insertText are ignored.
   */
  replace?: {
    start: number;
    end: number;
    text: string;
  };
  /** Absolute offset where insertText is inserted (self-close `/` → `>` case) */
  insertAt?: number;
  insertText?: string;
  /** Optional new cursor offset after the edit (absolute, in the resulting text) */
  cursorAt?: number;
};

export type OpenSite = {
  /** e.g. `#if`, `@banner`, or HTML `div` */
  name: string;
  /** Indentation string of the line containing the open tag */
  indent: string;
  /** Absolute offset of the open tag start (`<` / `[`) */
  offset: number;
  kind?: "ftl" | "html";
};

/** HTML void elements — no closing tag. */
const HTML_VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * After the user typed `/` at `offset` (offset is position after `/`),
 * decide what to auto-insert.
 *
 * 1) Inside open tag: `<#assign /` → insert `>`
 * 2) Close tag start: `</` → replace indent+`</` with opener-aligned close
 *    (`</#if>`, `</html>`, …). Mid-block `#else` / `#elseif` are never targets.
 */
export function autoCloseAfterSlash(
  text: string,
  offset: number
): CloseEdit | undefined {
  if (offset < 1 || text[offset - 1] !== "/") {
    return undefined;
  }

  const before = text.slice(0, offset);

  // Case 2: `</` or `[/`
  const close = before.match(/([<\[])\/$/);
  if (close) {
    const openBracket = close[1] as "<" | "[";
    const open = findUnclosedOpen(before.slice(0, -2), openBracket);
    if (!open) {
      return undefined;
    }

    const line = lineIndentAt(text, offset - 2);
    const closeStart = offset - 2; // '<' or '[' of `</` / `[/`
    const closeToken = closeTokenFor(open, openBracket);
    // Only rewrite indent when `</` is the sole content on the line.
    // Same-line `<#if x></` must not eat the open tag.
    const prefix = text.slice(line.lineStart, closeStart);
    const onlyCloseOnLine = prefix.trim() === "";
    if (onlyCloseOnLine) {
      const textOut = `${open.indent}${closeToken}`;
      return {
        replace: {
          start: line.lineStart,
          end: offset,
          text: textOut,
        },
        cursorAt: line.lineStart + textOut.length,
      };
    }
    return {
      replace: {
        start: closeStart,
        end: offset,
        text: closeToken,
      },
      cursorAt: closeStart + closeToken.length,
    };
  }

  // Case 1: self-close slash inside an open directive (not yet closed).
  // Do not treat `/` as self-close when it looks like division / a binary
  // operator inside an assignment expression, e.g.
  //   `<#local idxCursor = startBit /`  → user typing `startBit / n`
  // Innermost open only — an unclosed outer tag must not swallow a nested
  // `<#assign /` (would otherwise self-close `#function`).
  const open = matchInnermostOpenBeforeSlash(before);
  if (open) {
    if (/\/[>\]]$/.test(before)) {
      return undefined;
    }
    const after = text[offset];
    if (after === ">" || after === "]") {
      return undefined;
    }
    const inner = open.inner;
    if (!inner.endsWith("/")) {
      return undefined;
    }
    if (!isSelfCloseSlashIntent(inner.slice(0, -1))) {
      return undefined;
    }
    const end = open.openBracket === "[" ? "]" : ">";
    return {
      insertAt: offset,
      insertText: end,
      cursorAt: offset + 1,
    };
  }

  return undefined;
}

/**
 * Last `<#` / `<@` / `[#` / `[@` whose tag body (no closer yet) reaches `before`'s
 * end. Rejects matches that would span a nested tag open.
 */
function matchInnermostOpenBeforeSlash(before: string):
  | { openBracket: "<" | "["; inner: string }
  | undefined {
  const re = /([<\[])([#@])([a-zA-Z_][\w.]*)\b/g;
  let best:
    | { openBracket: "<" | "["; inner: string }
    | undefined;
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) {
    const openBracket = m[1] as "<" | "[";
    const innerStart = m.index + m[0].length;
    const inner = before.slice(innerStart);
    const closeBracket = openBracket === "<" ? ">" : "]";
    if (inner.includes(closeBracket)) {
      continue;
    }
    // Nested tag open inside this "inner" → not a single tag.
    if (openBracket === "<" && hasNestedAngleTagOpen(inner)) {
      continue;
    }
    if (openBracket === "[" && hasNestedSquareTagOpen(inner)) {
      continue;
    }
    best = { openBracket, inner };
  }
  return best;
}

function hasNestedAngleTagOpen(inner: string): boolean {
  let inStr: '"' | "'" | null = null;
  for (let p = 0; p < inner.length; p++) {
    const ch = inner[p]!;
    if (inStr) {
      if (ch === "\\" && p + 1 < inner.length) {
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
    if (ch === "<" && looksLikeAngleTagOpen(inner, p)) {
      return true;
    }
  }
  return false;
}

function hasNestedSquareTagOpen(inner: string): boolean {
  let inStr: '"' | "'" | null = null;
  for (let p = 0; p < inner.length; p++) {
    const ch = inner[p]!;
    if (inStr) {
      if (ch === "\\" && p + 1 < inner.length) {
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
    if (ch === "[" && looksLikeSquareTagOpen(inner, p)) {
      return true;
    }
  }
  return false;
}

/** `<#` / `<@` / `</` / HTML `<Name` — not comparison `x < y`. */
function looksLikeAngleTagOpen(text: string, p: number): boolean {
  if (text[p] !== "<") {
    return false;
  }
  if (
    text.startsWith("</#", p) ||
    text.startsWith("</@", p) ||
    text.startsWith("<#", p) ||
    text.startsWith("<@", p)
  ) {
    return true;
  }
  if (text.startsWith("</", p) && /[a-zA-Z]/.test(text[p + 2] ?? "")) {
    return true;
  }
  return /[a-zA-Z]/.test(text[p + 1] ?? "");
}

function looksLikeSquareTagOpen(text: string, p: number): boolean {
  if (text[p] !== "[") {
    return false;
  }
  return (
    text.startsWith("[#", p) ||
    text.startsWith("[@", p) ||
    text.startsWith("[/", p)
  );
}

function closeTokenFor(open: OpenSite, openBracket: "<" | "["): string {
  if (open.kind === "html") {
    return `</${open.name}>`;
  }
  const closeBracket = openBracket === "<" ? ">" : "]";
  return `${openBracket}/${open.name}${closeBracket}`;
}

/** Walk for last unclosed `<#name` / `<@name` (same bracket style). */
export function findUnclosedDirectiveName(
  textBefore: string,
  openBracket: string
): string | undefined {
  return findUnclosedDirectiveOpen(textBefore, openBracket)?.name;
}

export function findUnclosedDirectiveOpen(
  textBefore: string,
  openBracket: string
): OpenSite | undefined {
  return findUnclosedOpen(textBefore, openBracket === "[" ? "[" : "<");
}

/**
 * Innermost still-open FTL block or HTML element (angle bracket).
 * Square-bracket mode only considers FTL `[#…]` / `[@…]`.
 */
export function findUnclosedOpen(
  textBefore: string,
  openBracket: "<" | "[" = "<"
): OpenSite | undefined {
  const stack: OpenSite[] = [];

  if (openBracket === "[") {
    pushFtlTags(textBefore, "[", stack);
  } else {
    // Interleave FTL + HTML by scanning left-to-right.
    pushAngleTags(textBefore, stack);
  }

  return stack.length ? stack[stack.length - 1] : undefined;
}

function applyFtlTag(
  stack: OpenSite[],
  textBefore: string,
  opts: {
    index: number;
    isClose: boolean;
    sigil: string;
    name: string;
    inner: string;
  }
): void {
  const { index, isClose, sigil, name, inner } = opts;
  const selfClose = /\/\s*$/.test(inner);
  const key = `${sigil}${name}`;

  if (selfClose) {
    return;
  }
  if (sigil === "#" && MID_BLOCK.has(name)) {
    return;
  }
  if (isClose) {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i]!.kind !== "html" && stack[i]!.name === key) {
        stack.splice(i, 1);
        break;
      }
    }
    return;
  }
  if (!isBlockOpenForClose(sigil, name, inner)) {
    return;
  }
  const { indent } = lineIndentAt(textBefore, index);
  stack.push({ name: key, indent, offset: index, kind: "ftl" });
}

/** Square-bracket FTL only (`[` mode). Angle tags use `pushAngleTags`. */
function pushFtlTags(
  textBefore: string,
  openBracket: "<" | "[",
  stack: OpenSite[]
): void {
  if (openBracket !== "[") {
    return;
  }
  // Scan so an unclosed `[#function` cannot swallow a nested `[#assign]`.
  let i = 0;
  while (i < textBefore.length) {
    const start = textBefore.indexOf("[", i);
    if (start === -1) {
      break;
    }
    let p = start + 1;
    if (p >= textBefore.length) {
      break;
    }
    let isClose = false;
    if (textBefore[p] === "/") {
      isClose = true;
      p++;
    }
    if (textBefore[p] !== "#" && textBefore[p] !== "@") {
      i = start + 1;
      continue;
    }
    const sigil = textBefore[p]!;
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
    const end = scanSquareTagEnd(textBefore, p);
    if (end === -1) {
      i = start + 1;
      continue;
    }
    applyFtlTag(stack, textBefore, {
      index: start,
      isClose,
      sigil,
      name,
      inner: textBefore.slice(innerStart, end),
    });
    i = end + 1;
  }
}

/** Scan `<…>` for FTL directives and HTML elements in document order. */
function pushAngleTags(textBefore: string, stack: OpenSite[]): void {
  let i = 0;
  while (i < textBefore.length) {
    const start = textBefore.indexOf("<", i);
    if (start === -1) {
      break;
    }
    let p = start + 1;
    if (p >= textBefore.length) {
      break;
    }

    // HTML / FTL comments and doctype — skip through end (FTL comments nest)
    if (textBefore.startsWith("!--", p)) {
      const end = textBefore.indexOf("-->", p);
      i = end === -1 ? textBefore.length : end + 3;
      continue;
    }
    if (textBefore.startsWith("#--", p)) {
      // `p` is after `<`; comment starts at `start`
      i = skipFtlComment(textBefore, start);
      continue;
    }
    if (
      textBefore.startsWith("!DOCTYPE", p) ||
      textBefore.startsWith("!doctype", p)
    ) {
      const end = textBefore.indexOf(">", p);
      i = end === -1 ? textBefore.length : end + 1;
      continue;
    }

    let isClose = false;
    if (textBefore[p] === "/") {
      isClose = true;
      p++;
    }

    // FTL <# / <@ / </# / </@
    if (textBefore[p] === "#" || textBefore[p] === "@") {
      const sigil = textBefore[p]!;
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
      const end = scanAngleTagEnd(textBefore, p);
      if (end === -1) {
        // Incomplete open (EOF or nested tag) — do not swallow nested tags.
        i = start + 1;
        continue;
      }
      applyFtlTag(stack, textBefore, {
        index: start,
        isClose,
        sigil,
        name,
        inner: textBefore.slice(innerStart, end),
      });
      i = end + 1;
      continue;
    }

    // HTML tag name
    if (!/[a-zA-Z]/.test(textBefore[p] ?? "")) {
      i = start + 1;
      continue;
    }
    const nameStart = p;
    p++;
    while (p < textBefore.length && /[\w:-]/.test(textBefore[p]!)) {
      p++;
    }
    const name = textBefore.slice(nameStart, p);
    const innerStart = p;
    const end = scanAngleTagEnd(textBefore, p);
    if (end === -1) {
      i = start + 1;
      continue;
    }
    const inner = textBefore.slice(innerStart, end);
    i = end + 1;

    if (/\/\s*$/.test(inner)) {
      continue;
    }
    const lower = name.toLowerCase();
    if (isClose) {
      for (let s = stack.length - 1; s >= 0; s--) {
        if (
          stack[s]!.kind === "html" &&
          stack[s]!.name.toLowerCase() === lower
        ) {
          stack.splice(s, 1);
          break;
        }
      }
      continue;
    }
    if (HTML_VOID.has(lower)) {
      continue;
    }
    const { indent } = lineIndentAt(textBefore, start);
    stack.push({ name, indent, offset: start, kind: "html" });
  }
}

function scanAngleTagEnd(text: string, from: number): number {
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
    // Unclosed outer tag must not consume a nested tag's `>`.
    // Allow comparison `x < y` ( `<` not followed by tag-start shape).
    if (paren === 0 && ch === "<" && looksLikeAngleTagOpen(text, p)) {
      return -1;
    }
    if (ch === ">" && paren === 0) {
      return p;
    }
  }
  return -1;
}

export function lineIndentAt(
  text: string,
  offset: number
): { lineStart: number; contentStart: number; indent: string } {
  let lineStart = Math.max(0, Math.min(offset, text.length));
  while (lineStart > 0 && text[lineStart - 1] !== "\n") {
    lineStart--;
  }
  let contentStart = lineStart;
  while (
    contentStart < text.length &&
    (text[contentStart] === " " || text[contentStart] === "\t")
  ) {
    contentStart++;
  }
  return {
    lineStart,
    contentStart,
    indent: text.slice(lineStart, contentStart),
  };
}

const ALWAYS_BLOCK = new Set([
  "if",
  "list",
  "macro",
  "function",
  "attempt",
  "compress",
  "escape",
  "noescape",
  "autoesc",
  "noautoesc",
  "transform",
  "switch",
  "items",
]);

const CAPTURE_ASSIGN = new Set(["assign", "local", "global"]);

const MID_BLOCK = new Set([
  "else",
  "elseif",
  "recover",
  "case",
  "default",
  "sep",
]);

/**
 * After `>` / `]` closes a pairable open tag, insert the matching close tag
 * immediately after the caret (HTML-style: `<div>|</div>`).
 */
export function autoClosePairOnCloser(
  text: string,
  offset: number
): CloseEdit | undefined {
  if (offset < 1) {
    return undefined;
  }
  const closer = text[offset - 1];
  if (closer !== ">" && closer !== "]") {
    return undefined;
  }
  // Self-close `/>` / `/]` — nothing to pair.
  if (offset >= 2 && text[offset - 2] === "/") {
    return undefined;
  }

  const openBracket = closer === ">" ? "<" : "[";
  const tagStart = findTagStartEndingAt(text, offset, openBracket);
  if (tagStart < 0) {
    return undefined;
  }
  const tagText = text.slice(tagStart, offset);
  const open = parsePairableOpenTag(tagText);
  if (!open) {
    return undefined;
  }

  const closeToken =
    open.kind === "html"
      ? `</${open.name}>`
      : `${open.openBracket}/${open.name}${closer}`;

  const after = text.slice(offset);
  // Already paired on the same line or next non-empty line.
  if (
    after.startsWith(closeToken) ||
    new RegExp(`^\\s*\\r?\\n\\s*${escapeRe(closeToken)}`).test(after)
  ) {
    return undefined;
  }

  return {
    insertAt: offset,
    insertText: closeToken,
    cursorAt: offset,
  };
}

/** Index of `<` / `[` whose tag ends exactly at `offset - 1` (the closer). */
function findTagStartEndingAt(
  text: string,
  offset: number,
  openBracket: "<" | "["
): number {
  let from = 0;
  let found = -1;
  while (from < offset) {
    const idx = text.indexOf(openBracket, from);
    if (idx < 0 || idx >= offset) {
      break;
    }
    const namePos = idx + 1;
    // Skip comments / non-tags quickly for '<'
    if (openBracket === "<") {
      if (
        text.startsWith("!--", namePos) ||
        text.startsWith("#--", namePos) ||
        text.startsWith("!DOCTYPE", namePos) ||
        text.startsWith("!doctype", namePos)
      ) {
        from = idx + 1;
        continue;
      }
      // Ignore comparison `x < y` and other non-tag `<`.
      if (!looksLikeAngleTagOpen(text, idx)) {
        from = idx + 1;
        continue;
      }
      const end = scanAngleTagEnd(text, namePos);
      if (end === offset - 1) {
        found = idx;
      }
    } else {
      if (!looksLikeSquareTagOpen(text, idx)) {
        from = idx + 1;
        continue;
      }
      const end = scanSquareTagEnd(text, namePos);
      if (end === offset - 1) {
        found = idx;
      }
    }
    from = idx + 1;
  }
  return found;
}

function scanSquareTagEnd(text: string, from: number): number {
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
    if (paren === 0 && ch === "[" && looksLikeSquareTagOpen(text, p)) {
      return -1;
    }
    if (ch === "]" && paren === 0) {
      return p;
    }
  }
  return -1;
}

/**
 * After Enter following a block open tag line, ensure the body line is indented
 * and insert a matching close tag on the following line (fallback when `>` did
 * not already pair — e.g. pasted open tag).
 */
export function autoClosePairOnEnter(
  text: string,
  cursorOffset: number,
  indentUnit = "  "
): CloseEdit | undefined {
  if (cursorOffset < 1 || !indentUnit) {
    return undefined;
  }

  // Start of the new line (right after the newline), skipping any auto-indent.
  let afterNl = cursorOffset;
  while (
    afterNl > 0 &&
    (text[afterNl - 1] === " " || text[afterNl - 1] === "\t")
  ) {
    afterNl--;
  }
  let prevEnd = afterNl;
  if (prevEnd > 0 && text[prevEnd - 1] === "\n") {
    prevEnd--;
    if (prevEnd > 0 && text[prevEnd - 1] === "\r") {
      prevEnd--;
    }
  } else {
    return undefined;
  }
  if (prevEnd < 0) {
    return undefined;
  }

  const prev = lineIndentAt(text, prevEnd);
  const prevContent = text
    .slice(prev.contentStart, prevEnd + 1)
    .replace(/\s+$/, "");
  const open = parsePairableOpenTag(prevContent);
  if (!open) {
    return undefined;
  }

  // New line must be blank (only whitespace through EOL).
  let lineEnd = afterNl;
  while (
    lineEnd < text.length &&
    text[lineEnd] !== "\n" &&
    text[lineEnd] !== "\r"
  ) {
    const ch = text[lineEnd]!;
    if (ch !== " " && ch !== "\t") {
      return undefined;
    }
    lineEnd++;
  }

  const closeToken =
    open.kind === "html"
      ? `</${open.name}>`
      : `${open.openBracket}/${open.name}${open.openBracket === "<" ? ">" : "]"}`;

  // Same-line pair left behind after Enter split, or open line already had a close.
  if (prevContent.includes(closeToken)) {
    return undefined;
  }

  // Already balanced later in the file (body may sit between caret and `</#if>`).
  if (!isOpenStillUnclosed(text, prev.contentStart, open.openBracket)) {
    return undefined;
  }

  const bodyIndent = prev.indent + indentUnit;
  return {
    replace: {
      start: afterNl,
      end: lineEnd,
      text: `${bodyIndent}\n${prev.indent}${closeToken}`,
    },
    cursorAt: afterNl + bodyIndent.length,
  };
}

/**
 * True when the open tag that started at `openOffset` is still on the
 * unclosed stack after scanning the whole document.
 */
function isOpenStillUnclosed(
  text: string,
  openOffset: number,
  openBracket: "<" | "["
): boolean {
  const stack: OpenSite[] = [];
  if (openBracket === "[") {
    pushFtlTags(text, "[", stack);
  } else {
    pushAngleTags(text, stack);
  }
  return stack.some((s) => s.offset === openOffset);
}

/** Tag text like `<#if x>` / `<div class="a">` (not necessarily a whole line). */
function parsePairableOpenTag(
  tag: string
):
  | { openBracket: "<" | "["; name: string; kind: "ftl" | "html" }
  | undefined {
  const ftl = tag.match(/^([<\[])([#@])([a-zA-Z_][\w.]*)\b([\s\S]*)$/);
  if (ftl) {
    const openBracket = ftl[1] as "<" | "[";
    const sigil = ftl[2]!;
    const name = ftl[3]!;
    let rest = ftl[4]!;
    const closeBracket = openBracket === "<" ? ">" : "]";
    if (!rest.endsWith(closeBracket)) {
      return undefined;
    }
    rest = rest.slice(0, -1);
    if (/\/\s*$/.test(rest)) {
      return undefined;
    }
    // Guard: never pair a tag whose body swallowed a nested tag.
    if (
      (openBracket === "<" && hasNestedAngleTagOpen(rest)) ||
      (openBracket === "[" && hasNestedSquareTagOpen(rest))
    ) {
      return undefined;
    }
    if (sigil === "#" && MID_BLOCK.has(name)) {
      return undefined;
    }
    if (!shouldPairClose(sigil, name, rest)) {
      return undefined;
    }
    return { openBracket, name: `${sigil}${name}`, kind: "ftl" };
  }

  const html = tag.match(/^<([a-zA-Z][\w:-]*)(\s[\s\S]*)?>$/);
  if (!html) {
    return undefined;
  }
  const name = html[1]!;
  if (HTML_VOID.has(name.toLowerCase())) {
    return undefined;
  }
  const rest = html[2] ?? "";
  if (/\/\s*$/.test(rest)) {
    return undefined;
  }
  if (hasNestedAngleTagOpen(rest)) {
    return undefined;
  }
  return { openBracket: "<", name, kind: "html" };
}

function shouldPairClose(sigil: string, name: string, inner: string): boolean {
  if (sigil === "@") {
    return true;
  }
  if (ALWAYS_BLOCK.has(name)) {
    return true;
  }
  if (!CAPTURE_ASSIGN.has(name)) {
    return false;
  }
  const body = inner.replace(/\/\s*$/, "").trim();
  return !/(=|\+\+|--|\+=|-=|\*=|\/=|%=)/.test(body);
}

function isBlockOpenForClose(
  sigil: string,
  name: string,
  inner: string
): boolean {
  if (sigil === "#" && MID_BLOCK.has(name)) {
    return false;
  }
  return shouldPairClose(sigil, name, inner);
}

/**
 * Whether `/` after `inner` (tag text after the directive name, excluding the
 * trailing `/`) should auto-insert `>` / `]`.
 *
 * Deny-first (only clear tag trailers self-close):
 *
 * | Context | Example | Auto `>` |
 * |---------|---------|----------|
 * | empty body | `<#assign /` `<@banner /` | yes |
 * | after closed string | `<#include "lib.ftl" /` | yes |
 * | anything else | unquoted `lib/`, `./`, exprs, strings, … | **no** |
 *
 * Only two allow shapes — never “best-effort” guess on identifiers or `=`.
 */
function isSelfCloseSlashIntent(innerBeforeSlash: string): boolean {
  const lex = scanTagInnerLexical(innerBeforeSlash);
  // Still inside a literal or nesting — `/` is data or an expression, not `/>`.
  if (lex.inString || lex.parenDepth > 0 || lex.bracketDepth > 0) {
    return false;
  }

  const trimmed = innerBeforeSlash.trim();
  // `<#assign /` / `<@banner /` — slash is the first tag trailer.
  if (trimmed === "") {
    return true;
  }

  // `<#include "x" /` / `<#assign x = "a" /` — trailer after a completed string.
  // Not `<#include lib/` (unquoted path) and not `loadText("./`.
  if (/(["'])(?:\\.|[^\\])*?\1\s*$/.test(innerBeforeSlash)) {
    return true;
  }

  return false;
}

/** String / paren / bracket nesting at the end of an open-tag body. */
function scanTagInnerLexical(inner: string): {
  inString: boolean;
  parenDepth: number;
  bracketDepth: number;
} {
  let inStr: '"' | "'" | null = null;
  let paren = 0;
  let bracket = 0;
  for (let p = 0; p < inner.length; p++) {
    const ch = inner[p]!;
    if (inStr) {
      if (ch === "\\" && p + 1 < inner.length) {
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
    if (ch === "[") {
      bracket++;
      continue;
    }
    if (ch === "]" && bracket > 0) {
      bracket--;
    }
  }
  return {
    inString: inStr !== null,
    parenDepth: paren,
    bracketDepth: bracket,
  };
}

/** Apply a CloseEdit to a string (for tests). */
export function applyCloseEdit(text: string, edit: CloseEdit): string {
  if (edit.replace) {
    const { start, end, text: t } = edit.replace;
    return text.slice(0, start) + t + text.slice(end);
  }
  if (edit.insertAt !== undefined && edit.insertText !== undefined) {
    return (
      text.slice(0, edit.insertAt) + edit.insertText + text.slice(edit.insertAt)
    );
  }
  return text;
}
