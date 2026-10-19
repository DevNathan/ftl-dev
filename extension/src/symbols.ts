import { ftlCommentRanges, offsetInFtlComment } from "./comments";
import { FtlDoc, leadingFtlDoc } from "./ftldoc";
import { matchDirectiveHead, skipCommentAt, isFtlCommentStart } from "./scan";

export {
  buildLineMap,
  lineCharacterToOffsetMapped,
  offsetToPos,
  type LineMap,
} from "./lineMap";

export type { FtlDoc } from "./ftldoc";

export type SymbolKind = "assign" | "macro" | "function" | "local" | "global";

/** Parameter of a `#macro` / `#function` open tag. */
export interface FtlParam {
  name: string;
  /** Raw default expression when declared as `name=expr`. */
  defaultValue?: string;
  /** True for catch-all `name...`. */
  catchAll?: boolean;
}

export interface FtlSymbol {
  name: string;
  kind: SymbolKind;
  /** Absolute offset of the name in the document */
  nameOffset: number;
  nameLength: number;
  /** Present for `macro` / `function` when the open tag lists parameters. */
  params?: FtlParam[];
  /** Leading ftldoc (absent when `@ignore` or no comment). */
  doc?: FtlDoc;
  /**
   * Half-open [scopeStart, scopeEnd) for `#macro` / `#function` bodies, and for
   * `#local` the enclosing definition body. Locals are only visible inside.
   */
  scopeStart?: number;
  scopeEnd?: number;
}

export interface FtlPathRef {
  path: string;
  /** import namespace (as foo), if any */
  asName?: string;
  kind: "include" | "import";
  pathOffset: number;
  pathLength: number;
}

export interface FtlIndex {
  symbols: FtlSymbol[];
  pathRefs: FtlPathRef[];
}

const DECL =
  /[<\[]#\s*(assign|macro|function|local|global)\s+([a-zA-Z_][\w]*)/g;

const PATH_REF =
  /[<\[]#\s*(include|import)\s+["']([^"']+)["'](?:\s+as\s+([a-zA-Z_][\w]*))?/g;

export function indexFtl(text: string): FtlIndex {
  const symbols: FtlSymbol[] = [];
  const pathRefs: FtlPathRef[] = [];
  const comments = ftlCommentRanges(text);

  DECL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DECL.exec(text)) !== null) {
    if (offsetInFtlComment(m.index, comments)) {
      continue;
    }
    const kind = m[1] as SymbolKind;
    const name = m[2]!;
    const nameOffset = m.index + m[0].lastIndexOf(name);
    const sym: FtlSymbol = { name, kind, nameOffset, nameLength: name.length };
    const doc = leadingFtlDoc(text, m.index, comments);
    if (doc) {
      sym.doc = doc;
    }
    if (kind === "macro" || kind === "function") {
      const openBracket = text[m.index] === "[" ? "[" : "<";
      const closeBracket = openBracket === "[" ? "]" : ">";
      const afterName = m.index + m[0].length;
      const tagEnd = scanDirectiveTagEnd(text, afterName, closeBracket);
      if (tagEnd !== -1) {
        const inner = text.slice(afterName, tagEnd).replace(/\/\s*$/, "");
        const params = parseParamList(inner);
        if (params.length) {
          sym.params = params;
        }
        const selfClose = /\/\s*$/.test(text.slice(afterName, tagEnd));
        if (!selfClose) {
          const bodyStart = tagEnd + 1;
          const bodyEnd = findDefinitionBodyEnd(
            text,
            bodyStart,
            kind,
            openBracket
          );
          if (bodyEnd !== -1) {
            sym.scopeStart = bodyStart;
            sym.scopeEnd = bodyEnd;
          }
        }
      }
    }
    symbols.push(sym);
  }

  // Attach enclosing macro/function scope to #local symbols.
  const owners = symbols.filter(
    (s) =>
      (s.kind === "macro" || s.kind === "function") &&
      s.scopeStart !== undefined &&
      s.scopeEnd !== undefined
  );
  for (const sym of symbols) {
    if (sym.kind !== "local") {
      continue;
    }
    let best: FtlSymbol | undefined;
    for (const own of owners) {
      if (
        sym.nameOffset >= own.scopeStart! &&
        sym.nameOffset < own.scopeEnd! &&
        (!best ||
          own.scopeEnd! - own.scopeStart! < best.scopeEnd! - best.scopeStart!)
      ) {
        best = own;
      }
    }
    if (best) {
      sym.scopeStart = best.scopeStart;
      sym.scopeEnd = best.scopeEnd;
    }
  }

  PATH_REF.lastIndex = 0;
  while ((m = PATH_REF.exec(text)) !== null) {
    if (offsetInFtlComment(m.index, comments)) {
      continue;
    }
    const kind = m[1] as "include" | "import";
    const path = m[2];
    const asName = m[3];
    const pathOffset = m.index + m[0].indexOf(path);
    pathRefs.push({
      path,
      asName,
      kind,
      pathOffset,
      pathLength: path.length,
    });
  }

  return { symbols, pathRefs };
}

export function offsetToLineCharacter(
  text: string,
  offset: number
): { line: number; character: number } {
  let line = 0;
  let lastNl = -1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      lastNl = i;
    }
  }
  return { line, character: offset - (lastNl + 1) };
}

export function lineCharacterToOffset(
  text: string,
  line: number,
  character: number
): number {
  let currentLine = 0;
  let i = 0;
  while (i < text.length && currentLine < line) {
    if (text[i] === "\n") {
      currentLine++;
    }
    i++;
  }
  return Math.min(i + character, text.length);
}

/** Word / dotted name under offset (e.g. ns.greet or greet). */
export function identifierAt(
  text: string,
  offset: number
): { start: number; end: number; text: string } | undefined {
  if (offset < 0 || offset > text.length) {
    return undefined;
  }
  const isId = (c: string) => /[a-zA-Z0-9_]/.test(c);
  let start = offset;
  let end = offset;
  // Allow cursor at end of identifier
  if (start > 0 && !isId(text[start] ?? "") && isId(text[start - 1] ?? "")) {
    start--;
    end = start + 1;
  }
  while (start > 0 && isId(text[start - 1]!)) {
    start--;
  }
  while (end < text.length && isId(text[end]!)) {
    end++;
  }
  if (start === end) {
    return undefined;
  }

  // Extend left through dotted prefix: ns.name
  let dottedStart = start;
  while (dottedStart > 0 && text[dottedStart - 1] === ".") {
    let p = dottedStart - 1;
    if (p === 0 || !isId(text[p - 1]!)) {
      break;
    }
    p--;
    while (p >= 0 && isId(text[p]!)) {
      p--;
    }
    dottedStart = p + 1;
  }

  return {
    start: dottedStart,
    end,
    text: text.slice(dottedStart, end),
  };
}

/**
 * Find declarations for `name`.
 * When `atOffset` is set, `#local` symbols are only returned if the offset
 * lies inside their enclosing macro/function body; unscoped locals are omitted.
 */
export function findDefinitions(
  index: FtlIndex,
  name: string,
  atOffset?: number
): FtlSymbol[] {
  const parts = name.split(".");
  const simple = parts[parts.length - 1]!;
  const hits = index.symbols.filter((s) => s.name === simple || s.name === name);
  if (atOffset === undefined) {
    return hits;
  }
  const filtered = hits.filter((s) => {
    if (s.kind !== "local") {
      return true;
    }
    if (s.scopeStart === undefined || s.scopeEnd === undefined) {
      return false;
    }
    return atOffset >= s.scopeStart && atOffset < s.scopeEnd;
  });
  // Prefer locals over same-named assign/global when in scope.
  const locals = filtered.filter((s) => s.kind === "local");
  if (locals.length > 0) {
    return [...locals, ...filtered.filter((s) => s.kind !== "local")];
  }
  return filtered;
}

/**
 * End offset of `</#name>` / `[/#name]` matching the open at `bodyStart`
 * (exclusive start of body). Nested same-name opens are tracked.
 */
function findDefinitionBodyEnd(
  text: string,
  bodyStart: number,
  name: "macro" | "function",
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
          return i; // start of closing tag (body ends here)
        }
      } else {
        // Nested open of same kind (invalid FTL, still track)
        const closeCh = bracket === "[" ? "]" : ">";
        const tagEnd = scanDirectiveTagEnd(text, i + head.length, closeCh);
        if (tagEnd !== -1) {
          const selfClose = /\/\s*$/.test(text.slice(i + head.length, tagEnd));
          if (!selfClose) {
            depth++;
          }
          i = tagEnd + 1;
          continue;
        }
      }
    }
    i++;
  }
  return -1;
}

/** Index of closing `>` / `]` for a directive open tag, or -1. */
function scanDirectiveTagEnd(
  text: string,
  from: number,
  closeBracket: ">" | "]"
): number {
  let inStr: '"' | "'" | null = null;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  for (let i = from; i < text.length; i++) {
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

/**
 * Parse `#macro` / `#function` parameter list text (between name and tag closer).
 * Supports `name`, `name=default`, and catch-all `name...`.
 */
export function parseParamList(inner: string): FtlParam[] {
  const params: FtlParam[] = [];
  let i = 0;
  while (i < inner.length) {
    while (i < inner.length && /\s/.test(inner[i]!)) {
      i++;
    }
    if (i >= inner.length) {
      break;
    }
    if (!/[a-zA-Z_]/.test(inner[i]!)) {
      // Skip unknown token junk until whitespace
      while (i < inner.length && !/\s/.test(inner[i]!)) {
        i++;
      }
      continue;
    }
    const nameStart = i;
    i++;
    while (i < inner.length && /[\w]/.test(inner[i]!)) {
      i++;
    }
    const name = inner.slice(nameStart, i);
    let catchAll = false;
    if (inner.startsWith("...", i)) {
      catchAll = true;
      i += 3;
    }
    let defaultValue: string | undefined;
    while (i < inner.length && /\s/.test(inner[i]!)) {
      i++;
    }
    if (inner[i] === "=") {
      i++;
      while (i < inner.length && /\s/.test(inner[i]!)) {
        i++;
      }
      const valueStart = i;
      i = scanParamDefaultEnd(inner, i);
      defaultValue = inner.slice(valueStart, i).trim();
      if (!defaultValue) {
        defaultValue = undefined;
      }
    }
    params.push({
      name,
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(catchAll ? { catchAll: true } : {}),
    });
  }
  return params;
}

/** End offset of a parameter default expression (space-separated at depth 0). */
function scanParamDefaultEnd(text: string, from: number): number {
  let inStr: '"' | "'" | null = null;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  for (let i = from; i < text.length; i++) {
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
    if (ch === "[") {
      bracket++;
      continue;
    }
    if (ch === "]" && bracket > 0) {
      bracket--;
      continue;
    }
    if (/\s/.test(ch) && paren === 0 && brace === 0 && bracket === 0) {
      return i;
    }
  }
  return text.length;
}

/** Format `name(a, b=1)` / `name(a...)` for signature labels. */
export function formatSignatureLabel(
  name: string,
  params: readonly FtlParam[] | undefined
): string {
  if (!params || params.length === 0) {
    return `${name}()`;
  }
  const parts = params.map((p) => {
    let s = p.name;
    if (p.catchAll) {
      s += "...";
    }
    if (p.defaultValue !== undefined) {
      s += `=${p.defaultValue}`;
    }
    return s;
  });
  return `${name}(${parts.join(", ")})`;
}
