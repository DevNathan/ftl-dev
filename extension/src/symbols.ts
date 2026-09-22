export type SymbolKind = "assign" | "macro" | "function" | "local" | "global";

export interface FtlSymbol {
  name: string;
  kind: SymbolKind;
  /** Absolute offset of the name in the document */
  nameOffset: number;
  nameLength: number;
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

  DECL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DECL.exec(text)) !== null) {
    const kind = m[1] as SymbolKind;
    const name = m[2];
    const nameOffset = m.index + m[0].lastIndexOf(name);
    symbols.push({ name, kind, nameOffset, nameLength: name.length });
  }

  PATH_REF.lastIndex = 0;
  while ((m = PATH_REF.exec(text)) !== null) {
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

export function findDefinitions(
  index: FtlIndex,
  name: string
): FtlSymbol[] {
  const parts = name.split(".");
  const simple = parts[parts.length - 1]!;
  return index.symbols.filter((s) => s.name === simple || s.name === name);
}
