/**
 * Project file `.ftl-data-model.json` — ADR 0002 stretch (plans 0031 / 0032b).
 * Pure parse / path / cache helpers — no vscode dependency.
 */

import * as path from "path";

/** Fixed file name at the workspace-folder root only (no walk-up). */
export const FTL_DATA_MODEL_FILENAME = ".ftl-data-model.json";

export type FtlDataModelFile = {
  roots: string[];
  /** Path prefix / simple glob → extra root names for matching templates. */
  templates: Record<string, string[]>;
};

export type ParseFtlDataModelOk = FtlDataModelFile;
export type ParseFtlDataModelErr = { error: string };

const EMPTY_MODEL: FtlDataModelFile = { roots: [], templates: {} };

/**
 * Parse `{ "roots": string[], "templates"?: { [pathPattern]: string[] } }`.
 * Missing `roots` / `templates` → empty. Bare arrays / bad types → `{ error }`.
 */
export function parseFtlDataModelJson(
  raw: string
): ParseFtlDataModelOk | ParseFtlDataModelErr {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `JSON parse failed: ${msg}` };
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      error:
        'Expected a JSON object with a "roots" string array (bare arrays are not supported).',
    };
  }

  const obj = value as Record<string, unknown>;

  let roots: string[] = [];
  if ("roots" in obj) {
    const rootsRaw = obj.roots;
    if (!Array.isArray(rootsRaw)) {
      return { error: '"roots" must be an array of strings.' };
    }
    for (let i = 0; i < rootsRaw.length; i++) {
      const item = rootsRaw[i];
      if (typeof item !== "string") {
        return {
          error: `"roots[${i}]" must be a string (got ${typeof item}).`,
        };
      }
      roots.push(item);
    }
  }

  let templates: Record<string, string[]> = {};
  if ("templates" in obj) {
    const templatesRaw = obj.templates;
    if (
      templatesRaw === null ||
      typeof templatesRaw !== "object" ||
      Array.isArray(templatesRaw)
    ) {
      return {
        error: '"templates" must be an object of path-pattern → string[].',
      };
    }
    const out: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(
      templatesRaw as Record<string, unknown>
    )) {
      if (!Array.isArray(val)) {
        return {
          error: `"templates[${JSON.stringify(key)}]" must be an array of strings.`,
        };
      }
      const names: string[] = [];
      for (let i = 0; i < val.length; i++) {
        const item = val[i];
        if (typeof item !== "string") {
          return {
            error: `"templates[${JSON.stringify(key)}][${i}]" must be a string (got ${typeof item}).`,
          };
        }
        names.push(item);
      }
      out[key] = names;
    }
    templates = out;
  }

  return { roots, templates };
}

/**
 * Absolute path to `.ftl-data-model.json` at a workspace-folder root.
 * Returns undefined when there is no workspace folder (outside-workspace docs).
 */
export function dataModelFileFsPath(
  workspaceFolderFsPath: string | undefined
): string | undefined {
  if (!workspaceFolderFsPath) {
    return undefined;
  }
  return path.join(workspaceFolderFsPath, FTL_DATA_MODEL_FILENAME);
}

/** Merge settings allowlist with file roots (set-union semantics; order irrelevant). */
export function mergeDataModelAllowlist(
  settings: readonly string[],
  fileRoots: readonly string[]
): string[] {
  return [...settings, ...fileRoots];
}

/** Normalize to `/` separators without a leading `./`. */
export function normalizeTemplatePath(relPath: string): string {
  return relPath.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * Thin path match: prefix (no `*`) or simple glob (`*` = non-slash run, `**` = any).
 * Patterns are matched against the full relative template path.
 */
export function templatePathMatches(
  templateRelativePath: string,
  pattern: string
): boolean {
  const pathNorm = normalizeTemplatePath(templateRelativePath);
  const pat = normalizeTemplatePath(pattern);
  if (!pat.includes("*")) {
    return pathNorm === pat || pathNorm.startsWith(pat);
  }
  return globPatternToRegExp(pat).test(pathNorm);
}

function globPatternToRegExp(pattern: string): RegExp {
  let src = "^";
  for (let i = 0; i < pattern.length; ) {
    if (pattern[i] === "*" && pattern[i + 1] === "*") {
      // `**` or `**/`
      if (pattern[i + 2] === "/") {
        src += "(?:.*/)?";
        i += 3;
      } else {
        src += ".*";
        i += 2;
      }
      continue;
    }
    if (pattern[i] === "*") {
      src += "[^/]*";
      i += 1;
      continue;
    }
    const ch = pattern[i]!;
    if (/[.+?^${}()|[\]\\]/.test(ch)) {
      src += `\\${ch}`;
    } else {
      src += ch;
    }
    i += 1;
  }
  src += "$";
  return new RegExp(src);
}

/**
 * Workspace-wide `roots` plus any `templates` entries whose pattern matches
 * the document path relative to the workspace folder.
 */
export function rootsForTemplatePath(
  model: FtlDataModelFile,
  templateRelativePath: string | undefined
): string[] {
  const out = [...model.roots];
  if (!templateRelativePath) {
    return out;
  }
  const norm = normalizeTemplatePath(templateRelativePath);
  for (const [pattern, names] of Object.entries(model.templates)) {
    if (templatePathMatches(norm, pattern)) {
      out.push(...names);
    }
  }
  return out;
}

export type DataModelFileReadResult =
  | { kind: "missing" }
  | { kind: "ok"; text: string }
  | { kind: "unreadable"; reason: string };

/**
 * Load file model from a read result. Missing → empty. Invalid / unreadable →
 * empty model and optional warning callback (never throws).
 */
export function loadFileModelFromRead(
  read: DataModelFileReadResult,
  onWarn?: (reason: string) => void
): FtlDataModelFile {
  if (read.kind === "missing") {
    return { ...EMPTY_MODEL, roots: [], templates: {} };
  }
  if (read.kind === "unreadable") {
    onWarn?.(read.reason);
    return { roots: [], templates: {} };
  }
  const parsed = parseFtlDataModelJson(read.text);
  if ("error" in parsed) {
    onWarn?.(parsed.error);
    return { roots: [], templates: {} };
  }
  return { roots: [...parsed.roots], templates: { ...parsed.templates } };
}

/**
 * Load file roots only (0031 helper). Prefer `loadFileModelFromRead` +
 * `rootsForTemplatePath` when path scoping matters.
 */
export function loadFileRootsFromRead(
  read: DataModelFileReadResult,
  onWarn?: (reason: string) => void
): string[] {
  return loadFileModelFromRead(read, onWarn).roots;
}

/**
 * Per-workspace-folder cache of parsed data-model files.
 * Invalidate on create/change/delete.
 */
export class DataModelRootsCache {
  private readonly entries = new Map<string, FtlDataModelFile>();

  get(folderKey: string): FtlDataModelFile | undefined {
    return this.entries.get(folderKey);
  }

  set(folderKey: string, model: FtlDataModelFile): void {
    this.entries.set(folderKey, {
      roots: [...model.roots],
      templates: { ...model.templates },
    });
  }

  invalidate(folderKey: string): void {
    this.entries.delete(folderKey);
  }

  invalidateAll(): void {
    this.entries.clear();
  }

  /**
   * Cache-first load. On miss, call `read` and store the result (including empty).
   */
  getOrLoad(
    folderKey: string,
    read: () => DataModelFileReadResult,
    onWarn?: (reason: string) => void
  ): FtlDataModelFile {
    const hit = this.entries.get(folderKey);
    if (hit !== undefined) {
      return hit;
    }
    const model = loadFileModelFromRead(read(), onWarn);
    this.entries.set(folderKey, model);
    return model;
  }
}
