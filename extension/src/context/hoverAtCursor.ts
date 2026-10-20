/** Pure cursor helpers for hover (?builtin / #directive / named-param LHS / clause). */

import {
  DIRECTIVE_CLAUSE_KEYWORDS,
  paramDocumentation,
} from "../directiveParams";
import { scanNamedParamLhs } from "../namedParamLhs";
import { scanDirectiveClose } from "../scan";

/** Directives that expose catalog named-param Hover. */
const NAMED_PARAM_DIRECTIVES = new Set(["ftl", "setting", "include"]);

const CLAUSE_KEYWORDS = new Set(["as", "in", "using"]);

export type NamedParamAt = {
  name: string;
  start: number;
  end: number;
};

export function builtinAt(text: string, offset: number): string | undefined {
  // Walk left to start of identifier, require preceding '?'
  let end = offset;
  if (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
      end++;
    }
  }
  let start = Math.min(offset, end);
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1]!)) {
    start--;
  }
  if (start > 0 && text[start - 1] === "?") {
    const name = text.slice(start, end);
    return name || undefined;
  }
  return undefined;
}

export function directiveAt(text: string, offset: number): string | undefined {
  let end = offset;
  if (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
      end++;
    }
  }
  let start = Math.min(offset, end);
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1]!)) {
    start--;
  }
  const name = text.slice(start, end);
  if (!name) {
    return undefined;
  }
  // Look back for <# or </# or [# or [/#
  const prefix = text.slice(Math.max(0, start - 3), start);
  if (
    prefix.endsWith("<#") ||
    prefix.endsWith("[#") ||
    prefix.endsWith("</#") ||
    prefix.endsWith("[/#")
  ) {
    return name;
  }
  return undefined;
}

/**
 * Known `#ftl` / `#setting` / `#include` named-param LHS under the caret.
 * Returns only when `paramDocumentation(name)` is defined.
 * Does not match the directive name itself, values, strings, or nested keys.
 */
export function namedParamAt(
  text: string,
  offset: number
): NamedParamAt | undefined {
  const word = undottedWordAt(text, offset);
  if (!word) {
    return undefined;
  }
  const tag = enclosingNamedParamDirective(text, word.start);
  if (!tag) {
    return undefined;
  }
  const inner = text.slice(tag.innerStart, tag.innerEnd);
  for (const hit of scanNamedParamLhs(inner)) {
    const start = tag.innerStart + hit.relOffset;
    const end = start + hit.name.length;
    if (start !== word.start || end !== word.end) {
      continue;
    }
    if (!paramDocumentation(hit.name)) {
      return undefined;
    }
    return { name: hit.name, start, end };
  }
  return undefined;
}

/**
 * Clause keyword `as` / `in` / `using` under the caret inside an open
 * directive that lists that keyword in `DIRECTIVE_CLAUSE_KEYWORDS`.
 */
export function clauseKeywordAt(
  text: string,
  offset: number
): NamedParamAt | undefined {
  const word = undottedWordAt(text, offset);
  if (!word || !CLAUSE_KEYWORDS.has(word.name)) {
    return undefined;
  }
  if (!paramDocumentation(word.name)) {
    return undefined;
  }
  const tag = enclosingClauseDirective(text, word.start);
  if (!tag) {
    return undefined;
  }
  const clauses = DIRECTIVE_CLAUSE_KEYWORDS[tag.name];
  if (!clauses?.includes(word.name)) {
    return undefined;
  }
  if (offsetInString(text, tag.innerStart, word.start)) {
    return undefined;
  }
  return { name: word.name, start: word.start, end: word.end };
}

/** Undotted identifier under offset (same word rules as builtin/directive). */
function undottedWordAt(
  text: string,
  offset: number
): { start: number; end: number; name: string } | undefined {
  let end = offset;
  if (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
      end++;
    }
  }
  let start = Math.min(offset, end);
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1]!)) {
    start--;
  }
  if (start === end) {
    return undefined;
  }
  // Reject dotted `ns.sym` — named params are plain idents
  if (start > 0 && text[start - 1] === ".") {
    return undefined;
  }
  if (end < text.length && text[end] === ".") {
    return undefined;
  }
  return { start, end, name: text.slice(start, end) };
}

/**
 * Innermost open `#ftl` / `#setting` / `#include` whose tag body contains
 * `offset` (not the directive name token).
 */
function enclosingNamedParamDirective(
  text: string,
  offset: number
): { name: string; innerStart: number; innerEnd: number } | undefined {
  return enclosingOpenDirective(text, offset, (name) =>
    NAMED_PARAM_DIRECTIVES.has(name)
  );
}

/** Innermost open clause-catalog directive whose tag body contains `offset`. */
function enclosingClauseDirective(
  text: string,
  offset: number
): { name: string; innerStart: number; innerEnd: number } | undefined {
  return enclosingOpenDirective(text, offset, (name) =>
    Object.prototype.hasOwnProperty.call(DIRECTIVE_CLAUSE_KEYWORDS, name)
  );
}

function enclosingOpenDirective(
  text: string,
  offset: number,
  accept: (name: string) => boolean
): { name: string; innerStart: number; innerEnd: number } | undefined {
  const re = /([<\[])#([a-zA-Z_][\w]*)\b/g;
  let last:
    | { name: string; innerStart: number; innerEnd: number }
    | undefined;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > offset) {
      break;
    }
    const name = m[2]!;
    if (!accept(name)) {
      continue;
    }
    const opener = m[1]!;
    const innerStart = m.index + m[0].length;
    // Caret on directive name → not in body
    if (offset < innerStart) {
      continue;
    }
    const closer = opener === "<" ? ">" : "]";
    const closeAt = scanDirectiveClose(text, innerStart, closer, {
      nestSquareInAngle: opener === "<",
    });
    const innerEnd = closeAt === -1 ? text.length : closeAt;
    if (offset >= innerEnd) {
      continue;
    }
    last = { name, innerStart, innerEnd };
  }
  return last;
}

/** True if `offset` is inside a quote opened at/after `from` (tag body). */
function offsetInString(text: string, from: number, offset: number): boolean {
  let inDouble = false;
  let inSingle = false;
  for (let i = from; i < offset; i++) {
    const c = text[i]!;
    if (inDouble) {
      if (c === "\\" && i + 1 < offset) {
        i++;
        continue;
      }
      if (c === '"') {
        inDouble = false;
      }
      continue;
    }
    if (inSingle) {
      if (c === "\\" && i + 1 < offset) {
        i++;
        continue;
      }
      if (c === "'") {
        inSingle = false;
      }
      continue;
    }
    if (c === '"') {
      inDouble = true;
      continue;
    }
    if (c === "'") {
      inSingle = true;
      continue;
    }
  }
  return inDouble || inSingle;
}
