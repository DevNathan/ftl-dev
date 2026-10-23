/**
 * Shared FTL scan primitives: comments, strings, nesting depth.
 * Behavior matches the duplicated loops historically inlined in diagnostics /
 * closeTag / signatureHelp — extract only; do not change policy.
 */

import { skipFtlComment } from "./comments";

export function isFtlCommentStart(text: string, i: number): boolean {
  return text.startsWith("<#--", i) || text.startsWith("[#--", i);
}

/** Skip FTL comment at `i`; unclosed → EOF. Never past `limit` when provided. */
export function skipCommentAt(
  text: string,
  i: number,
  limit?: number
): number {
  const end = skipFtlComment(text, i);
  return limit === undefined ? end : Math.min(end, limit);
}

/**
 * Advance one step through string / FTL-comment / plain char.
 * Returns the next index. When entering or leaving a string, `inString` mutates.
 */
export type StringState = '"' | "'" | null;

export function advanceStringOrComment(
  text: string,
  i: number,
  inString: { value: StringState },
  limit: number = text.length
): number {
  if (i >= limit) {
    return i;
  }
  if (!inString.value && isFtlCommentStart(text, i)) {
    return skipCommentAt(text, i, limit);
  }
  const c = text[i]!;
  if (inString.value) {
    if (c === "\\" && i + 1 < limit) {
      return i + 2;
    }
    if (c === inString.value) {
      inString.value = null;
    }
    return i + 1;
  }
  if (c === '"' || c === "'") {
    inString.value = c;
    return i + 1;
  }
  return -1; // caller handles non-string char
}

/** Skip a quoted string starting at `start` (must be " or '). */
export function skipString(
  text: string,
  start: number,
  limit: number = text.length
): number {
  const q = text[start]!;
  let i = start + 1;
  while (i < limit && i < text.length) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (text[i] === q) {
      return i + 1;
    }
    i++;
  }
  return limit;
}

/**
 * Find matching `}` for `{` at `openBrace`, respecting strings and FTL comments.
 * Returns index of closing brace or -1.
 */
export function findMatchingBrace(
  text: string,
  openBrace: number,
  limit: number = text.length
): number {
  let i = openBrace + 1;
  let depth = 1;
  let inString: StringState = null;
  while (i < limit && i < text.length) {
    if (!inString && isFtlCommentStart(text, i)) {
      const next = skipCommentAt(text, i);
      if (next > limit) {
        return -1;
      }
      i = next;
      continue;
    }
    const c = text[i]!;
    if (inString) {
      if (c === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (c === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      i++;
      continue;
    }
    if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }
  return -1;
}

/**
 * Scan from `from` until top-level `closeBracket` (`>` or `]`), respecting
 * strings, FTL comments, and paren/brace nesting. Optionally nest `[…]` when
 * closeBracket is `>` (angle tags with list literals).
 */
export function scanDirectiveClose(
  text: string,
  from: number,
  closeBracket: string,
  options: { nestSquareInAngle?: boolean } = {}
): number {
  let i = from;
  let inString: StringState = null;
  let paren = 0;
  let brace = 0;
  let square = 0;
  const nestSquare = options.nestSquareInAngle === true && closeBracket === ">";

  while (i < text.length) {
    if (!inString && isFtlCommentStart(text, i)) {
      i = skipCommentAt(text, i);
      continue;
    }
    const c = text[i]!;
    if (inString) {
      if (c === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (c === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      i++;
      continue;
    }
    if (c === "(") {
      paren++;
    } else if (c === ")" && paren > 0) {
      paren--;
    } else if (c === "{") {
      brace++;
    } else if (c === "}" && brace > 0) {
      brace--;
    } else if (nestSquare && c === "[" && paren === 0 && brace === 0) {
      square++;
    } else if (nestSquare && c === "]" && square > 0) {
      square--;
    } else if (
      c === closeBracket &&
      paren === 0 &&
      brace === 0 &&
      (!nestSquare || square === 0)
    ) {
      return i;
    }
    i++;
  }
  return -1;
}

/**
 * Match `<#name` / `</#name` / `[#name` / `<@name` etc. at `i` without
 * allocating `text.slice(i)`. Returns match length and fields, or undefined.
 */
export type DirectiveHead = {
  length: number;
  bracket: "<" | "[";
  isClose: boolean;
  sigil: "#" | "@";
  name: string;
};

export function matchDirectiveHead(
  text: string,
  i: number
): DirectiveHead | undefined {
  const open = text[i];
  if (open !== "<" && open !== "[") {
    return undefined;
  }
  let p = i + 1;
  let isClose = false;
  if (text[p] === "/") {
    isClose = true;
    p++;
  }
  const sigil = text[p];
  if (sigil !== "#" && sigil !== "@") {
    return undefined;
  }
  p++;
  const nameStart = p;
  if (!/[a-zA-Z_]/.test(text[p] ?? "")) {
    return undefined;
  }
  p++;
  while (p < text.length && /[\w.]/.test(text[p]!)) {
    p++;
  }
  // Require word boundary (same as \b): next must not be word char
  if (p < text.length && /[\w]/.test(text[p]!)) {
    return undefined;
  }
  return {
    length: p - i,
    bracket: open,
    isClose,
    sigil,
    name: text.slice(nameStart, p),
  };
}

/**
 * Directives whose body is never parsed as FTL (`noparse`, deprecated
 * `comment`), including camelCase spellings. Value: canonical name.
 */
export const LITERAL_BODY_DIRECTIVES: Readonly<Record<string, string>> = {
  noparse: "noparse",
  noParse: "noparse",
  comment: "comment",
};

/** Escape a string for use inside a RegExp character class or pattern. */
export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// FTL code regions (plan 0039)
// ---------------------------------------------------------------------------

type CodeStop =
  | { kind: "tag"; close: ">" | "]" }
  | { kind: "brace" };

function pushRange(out: Array<[number, number]>, s: number, e: number): void {
  if (e <= s) {
    return;
  }
  const last = out[out.length - 1];
  if (last && last[1] >= s) {
    last[1] = Math.max(last[1], e);
    return;
  }
  out.push([s, e]);
}

function isWordChar(c: string | undefined): boolean {
  return c !== undefined && /\w/.test(c);
}

/** `r"…"` / `r'…'`: quote at `q` preceded by a standalone `r`. */
function isRawStringQuote(text: string, q: number): boolean {
  return q >= 1 && text[q - 1] === "r" && !isWordChar(text[q - 2]);
}

/**
 * Scan a string literal whose opening quote is at `q`. String content is not
 * code; `${…}` inside a non-raw string is code again (recursively).
 * Returns the index just past the closing quote (or EOF).
 */
function scanCodeString(
  text: string,
  q: number,
  raw: boolean,
  out: Array<[number, number]>
): number {
  const quote = text[q]!;
  let j = q + 1;
  while (j < text.length) {
    const c = text[j]!;
    if (!raw && c === "\\") {
      j += 2;
      continue;
    }
    if (c === quote) {
      return j + 1;
    }
    if (!raw && c === "$" && text[j + 1] === "{") {
      j = scanCodeRegion(text, j, j + 2, { kind: "brace" }, out);
      continue;
    }
    j++;
  }
  return text.length;
}

/**
 * Emit code ranges from `segStart`, scanning from `from` until the stop
 * (tag close `>`/`]` at depth 0, or the `}` matching an already-open `${`).
 * Strings and FTL comments are excluded. Returns the index past the stop.
 */
function scanCodeRegion(
  text: string,
  segStart: number,
  from: number,
  stop: CodeStop,
  out: Array<[number, number]>
): number {
  let seg = segStart;
  let j = from;
  let paren = 0;
  let brace = stop.kind === "brace" ? 1 : 0;
  let square = 0;
  while (j < text.length) {
    if (isFtlCommentStart(text, j)) {
      pushRange(out, seg, j);
      j = skipCommentAt(text, j);
      seg = j;
      continue;
    }
    const c = text[j]!;
    if (c === '"' || c === "'") {
      const raw = isRawStringQuote(text, j);
      // Leave the raw-string prefix `r` out of code as well.
      pushRange(out, seg, raw ? j - 1 : j);
      j = scanCodeString(text, j, raw, out);
      seg = j;
      continue;
    }
    if (c === "(") {
      paren++;
    } else if (c === ")" && paren > 0) {
      paren--;
    } else if (c === "{") {
      brace++;
    } else if (c === "}") {
      if (stop.kind === "brace") {
        brace--;
        if (brace === 0) {
          pushRange(out, seg, j + 1);
          return j + 1;
        }
      } else if (brace > 0) {
        brace--;
      }
    } else if (stop.kind === "tag" && stop.close === "]") {
      // Square-bracket tag: `[#if users[0]?? && x]` closes at the depth-0 `]`.
      if (c === "[") {
        square++;
      } else if (c === "]") {
        if (square > 0) {
          square--;
        } else if (paren === 0 && brace === 0) {
          pushRange(out, seg, j + 1);
          return j + 1;
        }
      }
    } else if (stop.kind === "tag") {
      const nestSquare = stop.close === ">";
      if (nestSquare && c === "[" && paren === 0 && brace === 0) {
        square++;
      } else if (nestSquare && c === "]" && square > 0) {
        square--;
      } else if (
        c === stop.close &&
        paren === 0 &&
        brace === 0 &&
        square === 0
      ) {
        pushRange(out, seg, j + 1);
        return j + 1;
      }
    }
    j++;
  }
  pushRange(out, seg, text.length);
  return text.length;
}

/**
 * Sorted, non-overlapping half-open `[start, end)` ranges of FTL expression
 * code: FTL tags (`<#…>`, `</#…>`, `<@…>`, `</@…>`, square forms) and
 * `${…}` / `#{…}` bodies, minus string-literal contents (except `${…}` inside
 * non-raw strings), minus FTL comments, and skipping `<#noparse>` bodies.
 * Plain template text (HTML) is never code. One linear pass (nested string
 * interpolations are scanned once each).
 */
export function ftlCodeRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if ((c === "<" || c === "[") && isFtlCommentStart(text, i)) {
      i = skipCommentAt(text, i);
      continue;
    }
    if (c === "<" || c === "[") {
      const head = matchDirectiveHead(text, i);
      if (head) {
        const close = head.bracket === "<" ? ">" : "]";
        i = scanCodeRegion(
          text,
          i,
          i + head.length,
          { kind: "tag", close },
          out
        );
        const literal = LITERAL_BODY_DIRECTIVES[head.name];
        if (!head.isClose && head.sigil === "#" && literal) {
          const endTag = (head.bracket === "<" ? "</#" : "[/#") + head.name;
          const k = text.indexOf(endTag, i);
          i = k === -1 ? text.length : k;
        }
        continue;
      }
    }
    if ((c === "$" || c === "#") && text[i + 1] === "{") {
      i = scanCodeRegion(text, i, i + 2, { kind: "brace" }, out);
      continue;
    }
    i++;
  }
  return out;
}

/**
 * Membership test for monotonically non-decreasing offsets against sorted
 * ranges (amortized O(1) per query). Falls back to a reset when an offset
 * goes backwards.
 */
export function rangeCursor(
  ranges: Array<[number, number]>
): (offset: number) => boolean {
  let k = 0;
  let prev = -1;
  return (offset: number) => {
    if (offset < prev) {
      k = 0;
    }
    prev = offset;
    while (k < ranges.length && ranges[k]![1] <= offset) {
      k++;
    }
    const r = ranges[k];
    return r !== undefined && offset >= r[0];
  };
}
