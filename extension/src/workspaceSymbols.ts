import { indexFtl } from "./symbols";
import type { SymbolKind } from "./symbols";

export const WORKSPACE_SYMBOL_FIND_FILES_GLOB = "**/*.{ftl,ftlh,ftlx}";
export const WORKSPACE_SYMBOL_FIND_FILES_EXCLUDE =
  "**/{node_modules,.git,out,dist,build,target}/**";
export const WORKSPACE_SYMBOL_FIND_FILES_MAX = 200;

export const WORKSPACE_SYMBOL_SEARCH_MAX_RESULTS = 500;

export interface FtlDocInput {
  /** Stable id for tests; host passes `uri.toString()`. */
  uri: string;
  text: string;
}

export interface WorkspaceSymbolHit {
  name: string;
  kind: SymbolKind;
  uri: string;
  nameOffset: number;
  nameLength: number;
}

export interface SearchWorkspaceSymbolsOptions {
  maxResults?: number;
  /** default: substring match on lowercased name */
  match?: "substring" | "prefix";
  /** When true mid-loop, return hits collected so far (host maps token → this). */
  isCancelled?: () => boolean;
}

function nameMatchesQuery(
  name: string,
  queryLower: string,
  match: "substring" | "prefix"
): boolean {
  const nameLower = name.toLowerCase();
  if (match === "prefix") {
    return nameLower.startsWith(queryLower);
  }
  return nameLower.includes(queryLower);
}

export function mergeWorkspaceDocs(
  openDocs: FtlDocInput[],
  diskDocs: FtlDocInput[]
): FtlDocInput[] {
  const openUriSet = new Set(openDocs.map((d) => d.uri));
  const out = [...openDocs];
  for (const disk of diskDocs) {
    if (!openUriSet.has(disk.uri)) {
      out.push(disk);
    }
  }
  return out;
}

export function selectDiskDocsForMerge(
  openUriSet: ReadonlySet<string>,
  diskUriList: readonly string[],
  maxDisk: number = WORKSPACE_SYMBOL_FIND_FILES_MAX
): string[] {
  const selected: string[] = [];
  for (const uri of diskUriList) {
    if (selected.length >= maxDisk) {
      break;
    }
    if (!openUriSet.has(uri)) {
      selected.push(uri);
    }
  }
  return selected;
}

export function searchWorkspaceSymbols(
  query: string,
  docs: FtlDocInput[],
  options?: SearchWorkspaceSymbolsOptions
): WorkspaceSymbolHit[] {
  const maxResults =
    options?.maxResults ?? WORKSPACE_SYMBOL_SEARCH_MAX_RESULTS;
  const match = options?.match ?? "substring";
  const isCancelled = options?.isCancelled;
  const queryLower = query.trim().toLowerCase();
  const filterByName = queryLower.length > 0;

  const hits: WorkspaceSymbolHit[] = [];

  for (const doc of docs) {
    if (isCancelled?.()) {
      return hits;
    }
    const index = indexFtl(doc.text);
    for (const sym of index.symbols) {
      if (isCancelled?.()) {
        return hits;
      }
      if (
        filterByName &&
        !nameMatchesQuery(sym.name, queryLower, match)
      ) {
        continue;
      }
      hits.push({
        name: sym.name,
        kind: sym.kind,
        uri: doc.uri,
        nameOffset: sym.nameOffset,
        nameLength: sym.nameLength,
      });
      if (hits.length >= maxResults) {
        return hits;
      }
    }
  }

  return hits;
}
