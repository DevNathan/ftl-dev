/**
 * FTL semantic tokens (pure builder + encode).
 *
 * Master registration sketch:
 * ```ts
 * import {
 *   FTL_SEMANTIC_TOKEN_TYPES,
 *   semanticTokensForDocument,
 * } from "./semanticTokens";
 *
 * const legend = new vscode.SemanticTokensLegend([...FTL_SEMANTIC_TOKEN_TYPES]);
 * vscode.languages.registerDocumentSemanticTokensProvider(
 *   { language: "freemarker" },
 *   {
 *     async provideDocumentSemanticTokens(document) {
 *       const data = await semanticTokensForDocument(
 *         document.getText(),
 *         document.uri.fsPath,
 *         async (fsPath) => {
 *           try {
 *             const bytes = await vscode.workspace.fs.readFile(
 *               vscode.Uri.file(fsPath)
 *             );
 *             return Buffer.from(bytes).toString("utf8");
 *           } catch {
 *             return undefined;
 *           }
 *         }
 *       );
 *       return new vscode.SemanticTokens(data);
 *     },
 *   },
 *   legend
 * );
 * ```
 */

import { collectImportSymbols, FileReader } from "./imports";
import {
  FtlIndex,
  FtlPathRef,
  FtlSymbol,
  indexFtl,
  offsetToLineCharacter,
  SymbolKind,
} from "./symbols";

/** VS Code standard legend entries used by this provider. */
export const FTL_SEMANTIC_TOKEN_TYPES = [
  "function",
  "variable",
  "namespace",
  "method",
] as const;

export type FtlSemanticTokenType = (typeof FTL_SEMANTIC_TOKEN_TYPES)[number];

export interface SemanticTokenSpan {
  line: number;
  character: number;
  length: number;
  tokenType: FtlSemanticTokenType;
}

export interface BuildSemanticTokenOptions {
  /** Symbols loaded from `#import "…" as ns` (see collectImportSymbols). */
  importedByNs?: Map<string, FtlSymbol[]>;
}

function tokenTypeIndex(t: FtlSemanticTokenType): number {
  return FTL_SEMANTIC_TOKEN_TYPES.indexOf(t);
}

function kindToTokenType(kind: SymbolKind): FtlSemanticTokenType {
  switch (kind) {
    case "macro":
      return "method";
    case "function":
      return "function";
    case "assign":
    case "local":
    case "global":
    default:
      return "variable";
  }
}

function asNameOffset(text: string, ref: FtlPathRef): number | undefined {
  if (!ref.asName) {
    return undefined;
  }
  const rest = text.slice(ref.pathOffset + ref.pathLength);
  const m = /^["']\s+as\s+([a-zA-Z_][\w]*)/.exec(rest);
  if (!m || m[1] !== ref.asName) {
    return undefined;
  }
  return ref.pathOffset + ref.pathLength + m[0].lastIndexOf(ref.asName);
}

function spanKey(line: number, character: number, length: number): string {
  return `${line}:${character}:${length}`;
}

function addSpan(
  text: string,
  offset: number,
  length: number,
  tokenType: FtlSemanticTokenType,
  out: SemanticTokenSpan[],
  seen: Set<string>
): void {
  if (length <= 0 || offset < 0 || offset + length > text.length) {
    return;
  }
  const { line, character } = offsetToLineCharacter(text, offset);
  const key = spanKey(line, character, length);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  out.push({ line, character, length, tokenType });
}

/**
 * Build semantic token spans for an FTL document.
 * Declarations + cheap in-file identifier uses; optional `ns.member` via imports.
 */
export function buildSemanticTokenSpans(
  text: string,
  options: BuildSemanticTokenOptions = {}
): SemanticTokenSpan[] {
  const index = indexFtl(text);
  return buildSemanticTokenSpansFromIndex(text, index, options);
}

export function buildSemanticTokenSpansFromIndex(
  text: string,
  index: FtlIndex,
  options: BuildSemanticTokenOptions = {}
): SemanticTokenSpan[] {
  const spans: SemanticTokenSpan[] = [];
  const seen = new Set<string>();
  const declOffsets = new Set<number>();

  const localByName = new Map<string, FtlSymbol>();
  for (const sym of index.symbols) {
    // Last declaration wins for kind (matches typical FTL redefine).
    localByName.set(sym.name, sym);
  }

  const nsNames = new Set<string>();
  for (const ref of index.pathRefs) {
    if (ref.kind === "import" && ref.asName) {
      nsNames.add(ref.asName);
    }
  }

  // 1) Declaration names
  for (const sym of index.symbols) {
    declOffsets.add(sym.nameOffset);
    addSpan(
      text,
      sym.nameOffset,
      sym.nameLength,
      kindToTokenType(sym.kind),
      spans,
      seen
    );
  }

  // 2) Import namespace (`as ns`)
  for (const ref of index.pathRefs) {
    if (ref.kind !== "import" || !ref.asName) {
      continue;
    }
    const off = asNameOffset(text, ref);
    if (off === undefined) {
      continue;
    }
    declOffsets.add(off);
    addSpan(text, off, ref.asName.length, "namespace", spans, seen);
  }

  // 3) `ns.member` when import-resolvable
  const importedByNs = options.importedByNs;
  if (importedByNs && nsNames.size > 0) {
    const dotted = /([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)/g;
    let m: RegExpExecArray | null;
    while ((m = dotted.exec(text)) !== null) {
      const ns = m[1]!;
      const member = m[2]!;
      if (!nsNames.has(ns)) {
        continue;
      }
      const remote = importedByNs.get(ns);
      if (!remote) {
        continue;
      }
      const rem = remote.find((s) => s.name === member);
      if (!rem) {
        continue;
      }
      const nsOffset = m.index;
      const memberOffset = m.index + ns.length + 1;
      addSpan(text, nsOffset, ns.length, "namespace", spans, seen);
      addSpan(
        text,
        memberOffset,
        member.length,
        kindToTokenType(rem.kind),
        spans,
        seen
      );
    }
  }

  // 4) In-file uses of local symbol / namespace names (cheap identifier scan)
  const ident = /[a-zA-Z_][\w]*/g;
  let im: RegExpExecArray | null;
  while ((im = ident.exec(text)) !== null) {
    const name = im[0];
    const offset = im.index;
    if (declOffsets.has(offset)) {
      continue;
    }

    if (nsNames.has(name)) {
      addSpan(text, offset, name.length, "namespace", spans, seen);
      continue;
    }

    const local = localByName.get(name);
    if (local) {
      addSpan(
        text,
        offset,
        name.length,
        kindToTokenType(local.kind),
        spans,
        seen
      );
    }
  }

  spans.sort((a, b) =>
    a.line !== b.line ? a.line - b.line : a.character - b.character
  );
  return spans;
}

/**
 * Encode spans as VS Code semantic tokens data (5×uint32 per token, delta-encoded).
 */
export function encodeSemanticTokenSpans(spans: SemanticTokenSpan[]): Uint32Array {
  const sorted = [...spans].sort((a, b) =>
    a.line !== b.line ? a.line - b.line : a.character - b.character
  );
  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;
  for (const s of sorted) {
    const typeIdx = tokenTypeIndex(s.tokenType);
    if (typeIdx < 0) {
      continue;
    }
    const deltaLine = s.line - prevLine;
    const deltaStart = deltaLine === 0 ? s.character - prevChar : s.character;
    data.push(deltaLine, deltaStart, s.length, typeIdx, 0);
    prevLine = s.line;
    prevChar = s.character;
  }
  return new Uint32Array(data);
}

/** Full pipeline for a document: index + optional import symbols → encoded tokens. */
export async function semanticTokensForDocument(
  text: string,
  fromFsPath: string,
  readFile: FileReader
): Promise<Uint32Array> {
  const index = indexFtl(text);
  const { byNs } = await collectImportSymbols(fromFsPath, index, readFile);
  const spans = buildSemanticTokenSpansFromIndex(text, index, {
    importedByNs: byNs,
  });
  return encodeSemanticTokenSpans(spans);
}
