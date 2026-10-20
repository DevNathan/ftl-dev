/**
 * Document-version cache for FTL index (+ optional import symbols).
 * Invalidate on version change or explicit delete.
 */

import { ftlCommentRanges } from "./comments";
import { collectImportSymbols, FileReader } from "./imports";
import { FtlIndex, FtlSymbol, indexFtl } from "./symbols";

export type DocCacheEntry = {
  version: number;
  text: string;
  index: FtlIndex;
  /** Top-level FTL comment ranges for the cached text. */
  comments: Array<[number, number]>;
  importByNs?: Map<string, FtlSymbol[]>;
  importQualified?: string[];
};

export class FtlDocCache {
  private readonly byUri = new Map<string, DocCacheEntry>();

  get(uri: string, version: number, text: string): DocCacheEntry {
    const prev = this.byUri.get(uri);
    if (prev && prev.version === version && prev.text === text) {
      return prev;
    }
    const entry: DocCacheEntry = {
      version,
      text,
      index: indexFtl(text),
      comments: ftlCommentRanges(text),
    };
    this.byUri.set(uri, entry);
    return entry;
  }

  async getWithImports(
    uri: string,
    version: number,
    text: string,
    fromFsPath: string,
    readFile: FileReader
  ): Promise<DocCacheEntry> {
    const entry = this.get(uri, version, text);
    if (entry.importByNs) {
      return entry;
    }
    const { byNs, qualified } = await collectImportSymbols(
      fromFsPath,
      entry.index,
      readFile
    );
    entry.importByNs = byNs;
    entry.importQualified = qualified;
    return entry;
  }

  delete(uri: string): void {
    this.byUri.delete(uri);
  }

  clear(): void {
    this.byUri.clear();
  }
}

/** Shared process-wide cache for language feature providers. */
export const sharedDocCache = new FtlDocCache();
