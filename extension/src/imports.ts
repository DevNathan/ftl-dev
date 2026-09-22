import * as path from "path";
import { FtlIndex, FtlSymbol, indexFtl } from "./symbols";

export function resolveImportFsPath(
  fromFsPath: string,
  refPath: string
): string {
  if (path.isAbsolute(refPath)) {
    return refPath;
  }
  return path.normalize(path.join(path.dirname(fromFsPath), refPath));
}

export type FileReader = (fsPath: string) => Promise<string | undefined>;

/** Load symbols from each `#import "…" as ns` into `ns.name` labels. */
export async function collectImportSymbols(
  fromFsPath: string,
  index: FtlIndex,
  readFile: FileReader
): Promise<{ qualified: string[]; byNs: Map<string, FtlSymbol[]> }> {
  const qualified: string[] = [];
  const byNs = new Map<string, FtlSymbol[]>();

  for (const ref of index.pathRefs) {
    if (ref.kind !== "import" || !ref.asName) {
      continue;
    }
    const target = resolveImportFsPath(fromFsPath, ref.path);
    const text = await readFile(target);
    if (!text) {
      continue;
    }
    const remote = indexFtl(text).symbols;
    byNs.set(ref.asName, remote);
    for (const s of remote) {
      qualified.push(`${ref.asName}.${s.name}`);
    }
  }

  return { qualified, byNs };
}
