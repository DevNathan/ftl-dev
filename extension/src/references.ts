import { ftlCommentRanges, offsetInFtlComment } from "./comments";
import { escapeRe } from "./scan";
import { FtlIndex, identifierAt, indexFtl } from "./symbols";

export interface ReferenceHit {
  startOffset: number;
  endOffset: number;
}

export interface FindReferencesOptions {
  /** When false, skip hits that land on a declaration name (default true). */
  includeDeclaration?: boolean;
}

/**
 * Collect occurrences of an identifier (or dotted `ns.sym`) in `text`.
 * Matches are whole-identifier (or whole dotted name), not substrings.
 * Hits inside FTL comments are omitted.
 */
export function findNameOccurrences(
  text: string,
  name: string,
  comments = ftlCommentRanges(text)
): ReferenceHit[] {
  if (!name) {
    return [];
  }
  const hits: ReferenceHit[] = [];
  const parts = name.split(".");
  // Dotted: match full `ns.sym` as a unit (word chars + dots between).
  const pattern =
    parts.length > 1
      ? `(?<![a-zA-Z0-9_])${parts.map(escapeRe).join("\\.")}(?![a-zA-Z0-9_])`
      : `(?<![a-zA-Z0-9_])${escapeRe(name)}(?![a-zA-Z0-9_])`;
  const re = new RegExp(pattern, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (offsetInFtlComment(m.index, comments)) {
      continue;
    }
    hits.push({ startOffset: m.index, endOffset: m.index + m[0].length });
  }
  return hits;
}

/**
 * Import namespaces that might qualify a simple symbol (`as ns`).
 */
export function importNamespaces(index: FtlIndex): string[] {
  const ns: string[] = [];
  for (const ref of index.pathRefs) {
    if (ref.kind === "import" && ref.asName) {
      ns.push(ref.asName);
    }
  }
  return ns;
}

function declarationOffsets(index: FtlIndex, simpleName: string): Set<number> {
  const set = new Set<number>();
  for (const s of index.symbols) {
    if (s.name === simpleName) {
      set.add(s.nameOffset);
    }
  }
  return set;
}

/**
 * Find same-file references for `symbolName`.
 * Best-effort `ns.sym`: also searches each import namespace as `ns.symbol`
 * when `symbolName` is a simple identifier; when dotted, also searches the
 * bare trailing identifier.
 */
export function findReferencesInText(
  text: string,
  symbolName: string,
  options: FindReferencesOptions = {}
): ReferenceHit[] {
  const includeDeclaration = options.includeDeclaration !== false;
  const index = indexFtl(text);
  const comments = ftlCommentRanges(text);
  const parts = symbolName.split(".");
  const simple = parts[parts.length - 1]!;
  const names = new Set<string>();
  names.add(symbolName);
  names.add(simple);

  if (parts.length === 1) {
    for (const ns of importNamespaces(index)) {
      names.add(`${ns}.${simple}`);
    }
  }

  const seen = new Set<string>();
  const hits: ReferenceHit[] = [];
  for (const n of names) {
    for (const hit of findNameOccurrences(text, n, comments)) {
      const key = `${hit.startOffset}:${hit.endOffset}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      hits.push(hit);
    }
  }

  hits.sort((a, b) => a.startOffset - b.startOffset);

  if (includeDeclaration) {
    return hits;
  }

  const declOffsets = declarationOffsets(index, simple);
  return hits.filter((h) => {
    // Skip if the hit's name span starts at a declaration name offset.
    // For `ns.sym`, the simple name may start later in the match.
    if (declOffsets.has(h.startOffset)) {
      return false;
    }
    const slice = text.slice(h.startOffset, h.endOffset);
    const dot = slice.lastIndexOf(".");
    if (dot >= 0) {
      const simpleStart = h.startOffset + dot + 1;
      if (declOffsets.has(simpleStart)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Resolve identifier at `offset` and find references in the same document.
 */
export function findReferencesAt(
  text: string,
  offset: number,
  options: FindReferencesOptions = {}
): ReferenceHit[] | undefined {
  const id = identifierAt(text, offset);
  if (!id) {
    return undefined;
  }
  return findReferencesInText(text, id.text, options);
}
