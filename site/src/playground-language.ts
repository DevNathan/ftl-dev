import { buildCompletions, completionContext } from "../../extension/src/catalog";
import { symbolCompletionEntries } from "../../extension/src/completion/helpers";
import { ftlCommentRanges, offsetInFtlComment } from "../../extension/src/comments";
import { validateFtl } from "../../extension/src/diagnostics";
import { paramDocumentation } from "../../extension/src/directiveParams";
import {
  builtinHover, directiveHover, isLiteralTemplatePath, symbolHoverAt,
  templatePathAt, templatePathHover,
} from "../../extension/src/docs";
import { ftldocTagHoverAt } from "../../extension/src/ftldocHover";
import { builtinAt, clauseKeywordAt, directiveAt, namedParamAt } from "../../extension/src/hoverTokens";
import { findDefinitions, identifierAt, indexFtl, type FtlSymbol } from "../../extension/src/symbols";

export function resolveFile(from: string, target: string): string | undefined {
  const root = "https://playground.invalid/";
  try {
    const url = new URL(target, root + from);
    return url.origin === "https://playground.invalid"
      ? decodeURIComponent(url.pathname.slice(1)) : undefined;
  } catch {
    return undefined;
  }
}

export function analyze(filename: string, files: Map<string, string>, strict: boolean) {
  const text = files.get(filename) ?? "";
  const index = indexFtl(text);
  const comments = ftlCommentRanges(text);
  const byNs = new Map<string, FtlSymbol[]>();
  for (const ref of index.pathRefs) {
    const path = resolveFile(filename, ref.path);
    const target = path === undefined ? undefined : files.get(path);
    if (ref.kind === "import" && ref.asName && target !== undefined && isLiteralTemplatePath(text, ref)) {
      byNs.set(ref.asName, indexFtl(target).symbols);
    }
  }
  return { text, index, comments, byNs, diagnostics: validateFtl(text, { index, strictVariables: strict }) };
}

export function hoverAt(
  data: ReturnType<typeof analyze>, filename: string, files: Map<string, string>, offset: number
) {
  const { text, index, comments, byNs } = data;
  const tag = ftldocTagHoverAt(text, offset, comments);
  if (tag) return tag;
  if (offsetInFtlComment(offset, comments)) return undefined;
  const ref = templatePathAt(index, offset);
  if (ref) {
    if (!isLiteralTemplatePath(text, ref)) return undefined;
    const path = resolveFile(filename, ref.path);
    const markdown = templatePathHover(ref.path, path === undefined ? undefined : files.get(path));
    return markdown ? { start: ref.pathOffset, end: ref.pathOffset + ref.pathLength, markdown } : undefined;
  }
  const builtin = builtinAt(text, offset);
  const directive = directiveAt(text, offset);
  const param = namedParamAt(text, offset) ?? clauseKeywordAt(text, offset);
  const markdown = (builtin && builtinHover(builtin))
    || (directive && directiveHover(directive))
    || (param && paramDocumentation(param.name))
    || symbolHoverAt(text, offset, index, byNs);
  if (!markdown) return undefined;
  const word = identifierAt(text, offset);
  return { start: word?.start ?? offset, end: word?.end ?? offset, markdown };
}

export function completionsAt(data: ReturnType<typeof analyze>, offset: number, explicit: boolean) {
  if (offsetInFtlComment(offset, data.comments)) return undefined;
  const context = completionContext(data.text.slice(0, offset));
  if (!explicit && !context.prefix && context.type === "general") return undefined;
  return {
    from: offset - context.prefix.length,
    items: buildCompletions(context, symbolCompletionEntries(data.index, data.byNs)),
  };
}

export function definitionAt(
  data: ReturnType<typeof analyze>, filename: string, files: Map<string, string>, offset: number
) {
  if (offsetInFtlComment(offset, data.comments)) return undefined;
  const ref = templatePathAt(data.index, offset);
  if (ref && isLiteralTemplatePath(data.text, ref)) {
    const file = resolveFile(filename, ref.path);
    return file && files.has(file) ? { file, offset: 0 } : undefined;
  }
  const id = identifierAt(data.text, offset);
  if (!id) return undefined;
  const [ns, name] = id.text.split(".");
  const imported = data.byNs.get(ns)?.find((symbol) => symbol.name === name);
  const path = data.index.pathRefs.find((item) => item.kind === "import" && item.asName === ns);
  const file = path && resolveFile(filename, path.path);
  if (imported && file) return { file, offset: imported.nameOffset };
  const local = findDefinitions(data.index, id.text, offset)[0];
  return local ? { file: filename, offset: local.nameOffset } : undefined;
}
