/**
 * Opt-in undeclared-root identifier diagnostics (ADR 0002 layer B).
 * Pure helpers — no vscode dependency.
 */

import { SPECIAL_VARS } from "./catalogLists";
import { findExpressionSpans } from "./comparisonDisplay";
import { skipFtlComment } from "./comments";
import {
  isFtlCommentStart,
  matchDirectiveHead,
  skipCommentAt,
} from "./scan";
import { indexFtl, type FtlIndex } from "./symbols";

/** Compatible with `FtlDiagnostic` in diagnostics.ts (avoid circular import). */
type UndeclaredDiagnostic = {
  offset: number;
  length: number;
  message: string;
  severity: "warning";
};

/** Clause keywords — never reported as undeclared variables. */
const CLAUSE_KEYWORDS = new Set(["as", "in", "using"]);

/** Tiny reserved / operator tokens that match the identifier regex. */
const RESERVED_TOKENS = new Set([
  "true",
  "false",
  "and",
  "or",
  "not",
  "gt",
  "gte",
  "lt",
  "lte",
  "eq",
  "neq",
  "as",
  "in",
  "using",
]);

const SPECIAL_VAR_SET = new Set(SPECIAL_VARS);

/** Directives whose `name=` LHS is never an undeclared variable. */
const NAMED_PARAM_DIRECTIVES = new Set(["ftl", "setting", "include"]);

export type StrictVariablesOptions = {
  strictVariables?: boolean;
  dataModel?: readonly string[];
  index?: FtlIndex;
};

type ScopedBinding = {
  name: string;
  nameOffset: number;
  nameLength: number;
  scopeStart: number;
  scopeEnd: number;
};

type DeclSpan = { start: number; end: number };

/**
 * When `strictVariables` is true, warn on root identifiers that are neither
 * declared/imported in-file nor listed in `dataModel`.
 */
export function findUndeclaredIdentifierIssues(
  text: string,
  options: StrictVariablesOptions = {}
): UndeclaredDiagnostic[] {
  if (!options.strictVariables) {
    return [];
  }

  const index = options.index ?? indexFtl(text);
  const dataModel = options.dataModel ?? [];
  const knownGlobals = buildKnownGlobals(index, dataModel);
  const loopVars = scanListLikeBindings(text);
  const declSpans = collectDeclarationSpans(text, index, loopVars);
  const namedParamLhs = collectNamedParamLhsSpans(text);
  const paramBindings = collectParamBindings(index);

  const diags: UndeclaredDiagnostic[] = [];
  const seen = new Set<string>();

  for (const span of findExpressionSpans(text)) {
    for (const hit of findRootIdentifiersInSpan(text, span.start, span.end)) {
      if (RESERVED_TOKENS.has(hit.name) || CLAUSE_KEYWORDS.has(hit.name)) {
        continue;
      }
      if (isInDeclSpan(hit.offset, hit.length, declSpans)) {
        continue;
      }
      if (isInDeclSpan(hit.offset, hit.length, namedParamLhs)) {
        continue;
      }
      if (knownGlobals.has(hit.name)) {
        continue;
      }
      if (isKnownAtOffset(hit.name, hit.offset, index, loopVars, paramBindings)) {
        continue;
      }

      const key = `${hit.offset}:${hit.length}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      diags.push({
        offset: hit.offset,
        length: hit.length,
        message: `Undeclared identifier '${hit.name}'.`,
        severity: "warning",
      });
    }
  }

  diags.sort((a, b) => a.offset - b.offset);
  return diags;
}

function buildKnownGlobals(
  index: FtlIndex,
  dataModel: readonly string[]
): Set<string> {
  const known = new Set<string>(dataModel);
  for (const s of index.symbols) {
    if (s.kind === "local") {
      continue;
    }
    // assign / global / macro / function — file-level / global-ish
    known.add(s.name);
  }
  for (const ref of index.pathRefs) {
    if (ref.kind === "import" && ref.asName) {
      known.add(ref.asName);
    }
  }
  return known;
}

function isKnownAtOffset(
  name: string,
  offset: number,
  index: FtlIndex,
  loopVars: ScopedBinding[],
  paramBindings: ScopedBinding[]
): boolean {
  for (const s of index.symbols) {
    if (s.name !== name || s.kind !== "local") {
      continue;
    }
    if (
      s.scopeStart !== undefined &&
      s.scopeEnd !== undefined &&
      offset >= s.scopeStart &&
      offset < s.scopeEnd
    ) {
      return true;
    }
  }
  for (const b of paramBindings) {
    if (
      b.name === name &&
      offset >= b.scopeStart &&
      offset < b.scopeEnd
    ) {
      return true;
    }
  }
  for (const b of loopVars) {
    if (
      b.name === name &&
      offset >= b.scopeStart &&
      offset < b.scopeEnd
    ) {
      return true;
    }
  }
  return false;
}

function collectParamBindings(index: FtlIndex): ScopedBinding[] {
  const out: ScopedBinding[] = [];
  for (const s of index.symbols) {
    if (
      (s.kind !== "macro" && s.kind !== "function") ||
      !s.params ||
      s.scopeStart === undefined ||
      s.scopeEnd === undefined
    ) {
      continue;
    }
    for (const p of s.params) {
      out.push({
        name: p.name,
        nameOffset: -1,
        nameLength: p.name.length,
        scopeStart: s.scopeStart,
        scopeEnd: s.scopeEnd,
      });
    }
  }
  return out;
}

function collectDeclarationSpans(
  text: string,
  index: FtlIndex,
  loopVars: ScopedBinding[]
): DeclSpan[] {
  const spans: DeclSpan[] = [];
  for (const s of index.symbols) {
    spans.push({
      start: s.nameOffset,
      end: s.nameOffset + s.nameLength,
    });
    // Macro / function parameter names in the open tag
    if (
      (s.kind === "macro" || s.kind === "function") &&
      s.params &&
      s.params.length > 0
    ) {
      const regionEnd =
        s.scopeStart !== undefined
          ? s.scopeStart
          : Math.min(s.nameOffset + 200, text.length);
      const region = text.slice(s.nameOffset + s.nameLength, regionEnd);
      for (const p of s.params) {
        const rel = findParamNameInRegion(region, p.name);
        if (rel >= 0) {
          const abs = s.nameOffset + s.nameLength + rel;
          spans.push({ start: abs, end: abs + p.name.length });
        }
      }
    }
  }
  for (const ref of index.pathRefs) {
    if (ref.kind !== "import" || !ref.asName) {
      continue;
    }
    // `as ns` after the path string
    const afterPath = ref.pathOffset + ref.pathLength;
    const slice = text.slice(afterPath, Math.min(afterPath + 80, text.length));
    const m = /\bas\s+([a-zA-Z_][\w]*)/.exec(slice);
    if (m && m[1] === ref.asName) {
      const abs = afterPath + m.index! + m[0].lastIndexOf(ref.asName);
      spans.push({ start: abs, end: abs + ref.asName.length });
    }
  }
  for (const b of loopVars) {
    spans.push({
      start: b.nameOffset,
      end: b.nameOffset + b.nameLength,
    });
  }
  return spans;
}

function findParamNameInRegion(region: string, name: string): number {
  // After the name: default `=`, comma/paren, catch-all `...`, whitespace, or tag end.
  const re = new RegExp(
    `(?:^|[^\\w.])(${escapeRe(name)})(?=\\s*[=,).>]|\\s*\\]|\\s*\\.\\.\\.|\\s|$)`
  );
  const m = re.exec(region);
  if (!m || m[1] === undefined) {
    return -1;
  }
  return m.index + m[0].lastIndexOf(name);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectNamedParamLhsSpans(text: string): DeclSpan[] {
  const spans: DeclSpan[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  while (i < text.length) {
    if (!inString && isFtlCommentStart(text, i)) {
      i = skipCommentAt(text, i);
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    const head = matchDirectiveHead(text, i);
    if (
      !head ||
      head.isClose ||
      head.sigil !== "#" ||
      !NAMED_PARAM_DIRECTIVES.has(head.name)
    ) {
      i++;
      continue;
    }

    const closeCh = head.bracket === "[" ? "]" : ">";
    const innerStart = i + head.length;
    const tagEnd = scanTagClose(text, innerStart, closeCh);
    if (tagEnd === -1) {
      i += head.length;
      continue;
    }
    const inner = text.slice(innerStart, tagEnd);
    for (const hit of scanNamedParamLhs(inner)) {
      if (CLAUSE_KEYWORDS.has(hit.name)) {
        continue;
      }
      // Only silence known catalog params + any LHS (plan: named-param LHS on
      // these directives). Silence all `ident=` LHS here — values still scanned.
      const abs = innerStart + hit.relOffset;
      spans.push({ start: abs, end: abs + hit.name.length });
    }
    i = tagEnd + 1;
  }
  return spans;
}

function scanNamedParamLhs(
  inner: string
): Array<{ name: string; relOffset: number }> {
  const hits: Array<{ name: string; relOffset: number }> = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  let paren = 0;
  let brace = 0;
  let bracket = 0;

  while (i < inner.length) {
    if (
      !inString &&
      (inner.startsWith("<#--", i) || inner.startsWith("[#--", i))
    ) {
      i = skipFtlComment(inner, i);
      continue;
    }
    const ch = inner[i]!;
    if (inString) {
      if (ch === "\\" && i + 1 < inner.length) {
        i += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      i++;
      continue;
    }
    if (ch === "(") {
      paren++;
      i++;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren--;
      i++;
      continue;
    }
    if (ch === "{") {
      brace++;
      i++;
      continue;
    }
    if (ch === "}" && brace > 0) {
      brace--;
      i++;
      continue;
    }
    if (ch === "[") {
      bracket++;
      i++;
      continue;
    }
    if (ch === "]" && bracket > 0) {
      bracket--;
      i++;
      continue;
    }

    if (
      paren === 0 &&
      brace === 0 &&
      bracket === 0 &&
      /[a-zA-Z_]/.test(ch)
    ) {
      const start = i;
      i++;
      while (i < inner.length && /[\w]/.test(inner[i]!)) {
        i++;
      }
      const name = inner.slice(start, i);
      let j = i;
      while (j < inner.length && /\s/.test(inner[j]!)) {
        j++;
      }
      if (
        j < inner.length &&
        inner[j] === "=" &&
        inner[j + 1] !== "="
      ) {
        hits.push({ name, relOffset: start });
      }
      continue;
    }
    i++;
  }
  return hits;
}

function isInDeclSpan(
  offset: number,
  length: number,
  spans: DeclSpan[]
): boolean {
  const end = offset + length;
  for (const s of spans) {
    if (offset >= s.start && end <= s.end) {
      return true;
    }
    if (offset === s.start && length === s.end - s.start) {
      return true;
    }
  }
  return false;
}

/**
 * Walk an expression span string-aware; yield root identifier uses only.
 */
function findRootIdentifiersInSpan(
  text: string,
  start: number,
  end: number
): Array<{ name: string; offset: number; length: number }> {
  const hits: Array<{ name: string; offset: number; length: number }> = [];
  let i = start;
  let inString: '"' | "'" | null = null;

  while (i < end && i < text.length) {
    if (
      !inString &&
      (text.startsWith("<#--", i) || text.startsWith("[#--", i))
    ) {
      i = skipFtlComment(text, i);
      continue;
    }
    const ch = text[i]!;
    if (inString) {
      if (ch === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      i++;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const identStart = i;
      i++;
      while (i < end && i < text.length && /[\w]/.test(text[i]!)) {
        i++;
      }
      const name = text.slice(identStart, i);

      // Builtin after ?
      if (identStart > 0 && text[identStart - 1] === "?") {
        continue;
      }

      // Preceded by `.` → property path or special var — never a root use
      if (identStart > 0 && text[identStart - 1] === ".") {
        // Special-var form `.now` (no ident before `.`) — explicitly skipped
        const beforeDot = identStart - 2;
        if (
          beforeDot < 0 ||
          !/[\w]/.test(text[beforeDot]!)
        ) {
          if (SPECIAL_VAR_SET.has(name)) {
            continue;
          }
        }
        continue;
      }

      hits.push({ name, offset: identStart, length: name.length });
      continue;
    }
    i++;
  }
  return hits;
}

/**
 * Collect `#list` / `#items` loop variable bindings with body scopes.
 */
export function scanListLikeBindings(text: string): ScopedBinding[] {
  const bindings: ScopedBinding[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;

  while (i < text.length) {
    if (!inString && isFtlCommentStart(text, i)) {
      i = skipCommentAt(text, i);
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    const head = matchDirectiveHead(text, i);
    if (
      !head ||
      head.isClose ||
      head.sigil !== "#" ||
      (head.name !== "list" && head.name !== "items")
    ) {
      i++;
      continue;
    }

    const openStart = i;
    const closeCh = head.bracket === "[" ? "]" : ">";
    const innerStart = i + head.length;
    const tagEnd = scanTagClose(text, innerStart, closeCh);
    if (tagEnd === -1) {
      i += head.length;
      continue;
    }

    const inner = text.slice(innerStart, tagEnd);
    const selfClose = /\/\s*$/.test(inner);
    const asBindings = parseAsBindings(inner, innerStart);
    i = tagEnd + 1;

    if (selfClose || asBindings.length === 0) {
      continue;
    }

    const bodyStart = tagEnd + 1;
    const bodyEnd = findBlockBodyEnd(
      text,
      bodyStart,
      head.name,
      head.bracket
    );
    if (bodyEnd === -1) {
      continue;
    }

    for (const b of asBindings) {
      bindings.push({
        name: b.name,
        nameOffset: b.offset,
        nameLength: b.name.length,
        scopeStart: bodyStart,
        scopeEnd: bodyEnd,
      });
    }
    // Continue after open tag; nested list/items still scanned by outer loop
    void openStart;
  }

  return bindings;
}

function parseAsBindings(
  inner: string,
  innerAbsStart: number
): Array<{ name: string; offset: number }> {
  const out: Array<{ name: string; offset: number }> = [];
  // Find `\bas\b` at nesting depth 0 (string-aware)
  let i = 0;
  let inString: '"' | "'" | null = null;
  let paren = 0;
  let brace = 0;
  let bracket = 0;

  while (i < inner.length) {
    if (
      !inString &&
      (inner.startsWith("<#--", i) || inner.startsWith("[#--", i))
    ) {
      i = skipFtlComment(inner, i);
      continue;
    }
    const ch = inner[i]!;
    if (inString) {
      if (ch === "\\" && i + 1 < inner.length) {
        i += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      i++;
      continue;
    }
    if (ch === "(") {
      paren++;
      i++;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren--;
      i++;
      continue;
    }
    if (ch === "{") {
      brace++;
      i++;
      continue;
    }
    if (ch === "}" && brace > 0) {
      brace--;
      i++;
      continue;
    }
    if (ch === "[") {
      bracket++;
      i++;
      continue;
    }
    if (ch === "]" && bracket > 0) {
      bracket--;
      i++;
      continue;
    }

    if (
      paren === 0 &&
      brace === 0 &&
      bracket === 0 &&
      inner.startsWith("as", i) &&
      (i === 0 || !/[\w]/.test(inner[i - 1]!)) &&
      (i + 2 >= inner.length || !/[\w]/.test(inner[i + 2]!))
    ) {
      let j = i + 2;
      while (j < inner.length && /\s/.test(inner[j]!)) {
        j++;
      }
      // first loop var
      if (j < inner.length && /[a-zA-Z_]/.test(inner[j]!)) {
        const n1 = j;
        j++;
        while (j < inner.length && /[\w]/.test(inner[j]!)) {
          j++;
        }
        out.push({
          name: inner.slice(n1, j),
          offset: innerAbsStart + n1,
        });
        while (j < inner.length && /\s/.test(inner[j]!)) {
          j++;
        }
        if (inner[j] === ",") {
          j++;
          while (j < inner.length && /\s/.test(inner[j]!)) {
            j++;
          }
          if (j < inner.length && /[a-zA-Z_]/.test(inner[j]!)) {
            const n2 = j;
            j++;
            while (j < inner.length && /[\w]/.test(inner[j]!)) {
              j++;
            }
            out.push({
              name: inner.slice(n2, j),
              offset: innerAbsStart + n2,
            });
          }
        }
      }
      break;
    }
    i++;
  }
  return out;
}

function findBlockBodyEnd(
  text: string,
  bodyStart: number,
  name: string,
  bracket: "<" | "["
): number {
  let i = bodyStart;
  let depth = 1;
  let inString: '"' | "'" | null = null;
  while (i < text.length) {
    if (!inString && isFtlCommentStart(text, i)) {
      i = skipCommentAt(text, i);
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }
    const head = matchDirectiveHead(text, i);
    if (
      head &&
      head.bracket === bracket &&
      head.sigil === "#" &&
      head.name === name
    ) {
      if (head.isClose) {
        depth--;
        if (depth === 0) {
          return i;
        }
        i += head.length;
        continue;
      }
      // Nested open of same kind
      const closeCh = bracket === "[" ? "]" : ">";
      const tagEnd = scanTagClose(text, i + head.length, closeCh);
      if (tagEnd !== -1) {
        const inner = text.slice(i + head.length, tagEnd);
        if (!/\/\s*$/.test(inner)) {
          depth++;
        }
        i = tagEnd + 1;
        continue;
      }
    }
    i++;
  }
  return -1;
}

function scanTagClose(
  text: string,
  from: number,
  closeBracket: ">" | "]"
): number {
  let inStr: '"' | "'" | null = null;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  for (let i = from; i < text.length; i++) {
    if (!inStr && isFtlCommentStart(text, i)) {
      i = skipCommentAt(text, i) - 1;
      continue;
    }
    const ch = text[i]!;
    if (inStr) {
      if (ch === "\\" && i + 1 < text.length) {
        i++;
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
    if (ch === "{") {
      brace++;
      continue;
    }
    if (ch === "}" && brace > 0) {
      brace--;
      continue;
    }
    if (ch === "[" && closeBracket === ">") {
      bracket++;
      continue;
    }
    if (ch === "]" && closeBracket === ">" && bracket > 0) {
      bracket--;
      continue;
    }
    if (
      ch === closeBracket &&
      paren === 0 &&
      brace === 0 &&
      (closeBracket === "]" || bracket === 0)
    ) {
      return i;
    }
  }
  return -1;
}
