import { FtlIndex, FtlSymbol, SymbolKind, indexFtl } from "./symbols";

/** Flat outline entry with absolute offsets (name span). */
export interface OutlineSymbol {
  name: string;
  kind: SymbolKind;
  /** Absolute offset of the symbol name */
  nameOffset: number;
  nameLength: number;
  /** Full span used as DocumentSymbol.range (name for now; cheap). */
  rangeOffset: number;
  rangeLength: number;
  children: OutlineSymbol[];
}

function toOutline(sym: FtlSymbol): OutlineSymbol {
  return {
    name: sym.name,
    kind: sym.kind,
    nameOffset: sym.nameOffset,
    nameLength: sym.nameLength,
    rangeOffset: sym.nameOffset,
    rangeLength: sym.nameLength,
    children: [],
  };
}

/**
 * Build a document-outline list from an FTL index.
 * Order follows source appearance. Nesting is omitted (no cheap AST).
 */
export function buildOutlineFromIndex(index: FtlIndex): OutlineSymbol[] {
  return index.symbols.map(toOutline);
}

/** Convenience: index then outline. */
export function buildOutline(text: string): OutlineSymbol[] {
  return buildOutlineFromIndex(indexFtl(text));
}
