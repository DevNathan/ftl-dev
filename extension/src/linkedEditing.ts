/**
 * Linked editing of paired FTL tag names (plan 0035).
 *
 * Pure (no `vscode` import). Given the document text and a cursor offset on the
 * name of an FTL open tag (`<#name`, `<@name`, `[#name`, `[@name`) or its
 * matching close (`</#name`, `</@name`, `[/#name`, `[/@name`), returns the two
 * name ranges so the editor can mirror typing between them.
 *
 * Plan 0036: an empty name (`<# x>` + `</#>`, `<@>` + `</@>`) stays paired
 * with zero-length name ranges so the user can retype it on either side.
 *
 * Out of scope: HTML tags, mid-block tags (`#else`, `#sep`, …), the LSP server
 * and Vim (see plan 0035 Non-goals).
 */

import { offsetInFtlComment, ftlCommentRanges, skipFtlComment } from "./comments";

/**
 * Word pattern for linked ranges. VS Code ends the linked session when the
 * edited text is no longer fully matched, so typing a space / `>` / `/` after a
 * name stops mirroring instead of copying it into the partner.
 *
 * Empty names (plan 0036): VS Code checks `(m ? m[0].length : 0) === text.length`,
 * so a zero-length range (`""`, no match → 0 === 0) passes and the linked
 * session is kept while the name is deleted and retyped.
 */
export const FTL_TAG_NAME_WORD_PATTERN = /[A-Za-z_][\w.]*/;

// Mirrors `MID_BLOCK` / `CAPTURE_ASSIGN` in closeTag.ts (kept as local copies;
// closeTag.ts does not export them). Keep in sync.
const MID_BLOCK = new Set(["else", "elseif", "recover", "case", "on", "default", "sep"]);
const CAPTURE_ASSIGN = new Set(["assign", "local", "global"]);

export type LinkedTagNameResult = {
  ranges: Array<[number, number]>;
  wordPattern: RegExp;
};

type TagKind = "open" | "close" | "namelessClose";

type Tag = {
  kind: TagKind;
  /** `bracket + sigil + name`, e.g. `<#if`, `[@ns.box`. */
  key: string;
  bracket: "<" | "[";
  sigil: "#" | "@";
  nameStart: number;
  nameEnd: number;
  pairable: boolean;
  /** Index of the partner tag in the tag list, or -1. */
  partner: number;
};

const NAME_START = /[A-Za-z_]/;
const NAME_CHAR = /[\w.]/;

/**
 * Linked name ranges for the tag name under `offset`, or `undefined` when the
 * cursor is not on a paired FTL tag name.
 */
export function linkedTagNameRanges(
  text: string,
  offset: number,
  opts?: { comments?: Array<[number, number]> }
): LinkedTagNameResult | undefined {
  const comments = opts?.comments ?? ftlCommentRanges(text);
  if (offsetInFtlComment(offset, comments)) {
    return undefined;
  }
  const tags = scanTags(text);
  matchTags(tags);
  for (const tag of tags) {
    if (offset < tag.nameStart || offset > tag.nameEnd) {
      continue;
    }
    if (tag.partner < 0) {
      return undefined;
    }
    const other = tags[tag.partner]!;
    const a: [number, number] = [tag.nameStart, tag.nameEnd];
    const b: [number, number] = [other.nameStart, other.nameEnd];
    return {
      ranges: a[0] < b[0] ? [a, b] : [b, a],
      wordPattern: FTL_TAG_NAME_WORD_PATTERN,
    };
  }
  return undefined;
}

/** Same lenient stack rule as `applyFtlTag` in closeTag.ts. */
function matchTags(tags: Tag[]): void {
  const stack: number[] = [];
  for (let t = 0; t < tags.length; t++) {
    const tag = tags[t]!;
    if (tag.kind === "open") {
      if (tag.pairable) {
        stack.push(t);
      }
      continue;
    }
    if (tag.kind === "namelessClose") {
      for (let s = stack.length - 1; s >= 0; s--) {
        const openIndex = stack[s]!;
        const open = tags[openIndex]!;
        if (open.sigil === "@" && open.bracket === tag.bracket) {
          stack.splice(s, 1);
          if (open.nameStart === open.nameEnd) {
            // Plan 0036: empty `<@ …>` + `</@>` are a pair. A non-empty `@`
            // open is popped without a pair (0035 rule, unchanged).
            open.partner = t;
            tag.partner = openIndex;
          }
          break;
        }
      }
      continue;
    }
    for (let s = stack.length - 1; s >= 0; s--) {
      const openIndex = stack[s]!;
      const open = tags[openIndex]!;
      if (open.key === tag.key) {
        stack.splice(s, 1);
        open.partner = t;
        tag.partner = openIndex;
        break;
      }
    }
  }
}

function isTagHead(text: string, p: number, bracket: "<" | "["): boolean {
  if (bracket === "<") {
    // Same shape as `looksLikeAngleTagOpen` in closeTag.ts.
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
  // Same shape as `looksLikeSquareTagOpen` in closeTag.ts.
  return (
    text.startsWith("[#", p) ||
    text.startsWith("[@", p) ||
    text.startsWith("[/", p)
  );
}

function isCommentStart(text: string, p: number): boolean {
  return text.startsWith("<#--", p) || text.startsWith("[#--", p);
}

/**
 * Skip a string literal starting at `p` (`"` or `'`, optionally `r`-prefixed
 * raw). Returns the offset after the closing quote, or `text.length`.
 */
function skipString(text: string, p: number, raw: boolean): number {
  const q = text[p]!;
  let i = p + 1;
  while (i < text.length) {
    const ch = text[i]!;
    if (!raw && ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === q) {
      return i + 1;
    }
    i++;
  }
  return text.length;
}

/** If a string literal starts at `p`, return its end; else -1. */
function stringAt(text: string, p: number): number {
  const ch = text[p];
  if (ch === '"' || ch === "'") {
    return skipString(text, p, false);
  }
  if (
    ch === "r" &&
    (text[p + 1] === '"' || text[p + 1] === "'") &&
    !NAME_CHAR.test(text[p - 1] ?? "")
  ) {
    return skipString(text, p + 1, true);
  }
  return -1;
}

/** Skip `${…}` / `#{…}` starting at `p` (on `$`/`#`). Returns offset after `}`. */
function skipInterpolation(text: string, p: number): number {
  let depth = 0;
  let i = p + 1; // on `{`
  while (i < text.length) {
    const s = stringAt(text, i);
    if (s >= 0) {
      i = s;
      continue;
    }
    const ch = text[i]!;
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
    i++;
  }
  return text.length;
}

/**
 * Scan a tag inner from `from` to its closer at depth 0. Returns the closer
 * offset, or -1 when the tag is incomplete (EOF or a new tag head first).
 */
function scanTagEnd(text: string, from: number, bracket: "<" | "["): number {
  const closer = bracket === "<" ? ">" : "]";
  let depth = 0;
  let i = from;
  while (i < text.length) {
    if (isCommentStart(text, i)) {
      i = skipFtlComment(text, i);
      continue;
    }
    const s = stringAt(text, i);
    if (s >= 0) {
      i = s;
      continue;
    }
    const ch = text[i]!;
    if (depth === 0 && ch === closer) {
      return i;
    }
    if (depth === 0 && isTagHead(text, i, bracket)) {
      return -1;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
    } else if ((ch === ")" || ch === "]" || ch === "}") && depth > 0) {
      depth--;
    }
    i++;
  }
  return -1;
}

function isPairableOpen(sigil: string, name: string, inner: string): boolean {
  if (/\/\s*$/.test(inner)) {
    return false; // self-closed
  }
  if (sigil === "@") {
    return true;
  }
  if (MID_BLOCK.has(name)) {
    return false;
  }
  if (CAPTURE_ASSIGN.has(name)) {
    // Same operator test as `shouldPairClose` in closeTag.ts.
    const body = inner.replace(/\/\s*$/, "").trim();
    return !/(=|\+\+|--|\+=|-=|\*=|\/=|%=)/.test(body);
  }
  return true;
}

function scanTags(text: string): Tag[] {
  const tags: Tag[] = [];
  let i = 0;
  while (i < text.length) {
    if (isCommentStart(text, i)) {
      i = skipFtlComment(text, i);
      continue;
    }
    const ch = text[i]!;
    if ((ch === "$" || ch === "#") && text[i + 1] === "{") {
      i = skipInterpolation(text, i);
      continue;
    }
    if (ch !== "<" && ch !== "[") {
      i++;
      continue;
    }
    const bracket = ch as "<" | "[";
    let p = i + 1;
    let close = false;
    if (text[p] === "/") {
      close = true;
      p++;
    }
    const sigil = text[p];
    if (sigil !== "#" && sigil !== "@") {
      i++;
      continue;
    }
    p++;
    const nameStart = p;
    if (NAME_START.test(text[p] ?? "")) {
      p++;
      while (p < text.length && NAME_CHAR.test(text[p]!)) {
        p++;
      }
    }
    const nameEnd = p;
    const name = text.slice(nameStart, nameEnd);
    const closer = bracket === "<" ? ">" : "]";
    if (name === "" && !close) {
      // Plan 0036: empty open head only before whitespace, the closer or `/`.
      // `<#--` never gets here (isCommentStart above); `<#-x`, `<#1`, EOF → not a tag.
      const next = text[nameEnd] ?? "";
      if (!(/\s/.test(next) || next === closer || next === "/")) {
        i = nameEnd;
        continue;
      }
    }
    const end = scanTagEnd(text, nameEnd, bracket);
    if (end < 0) {
      i = nameEnd; // incomplete: ignored, rescan after the name
      continue;
    }
    const inner = text.slice(nameEnd, end);
    const key = `${bracket}${sigil}${name}`;
    if (name === "" && close) {
      // Blank inner only: `</#>` / `[/#]` (plan 0036) and `</@>` / `[/@]`.
      if (inner.trim() === "") {
        tags.push({
          kind: sigil === "@" ? "namelessClose" : "close",
          key,
          bracket,
          sigil,
          nameStart,
          nameEnd,
          pairable: false,
          partner: -1,
        });
      }
      i = end + 1;
      continue;
    }
    const pairable = !close && isPairableOpen(sigil, name, inner);
    tags.push({
      kind: close ? "close" : "open",
      key,
      bracket,
      sigil,
      nameStart,
      nameEnd,
      pairable,
      partner: -1,
    });
    i = end + 1;
    if (pairable && sigil === "#" && name === "noparse") {
      const closeTok = `${bracket}/#noparse`;
      const next = text.indexOf(closeTok, i);
      i = next < 0 ? text.length : next;
    }
  }
  return tags;
}
