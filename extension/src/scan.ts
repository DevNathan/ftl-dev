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

/** Escape a string for use inside a RegExp character class or pattern. */
export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
