import { BUILTINS, DIRECTIVES } from "./catalog";
import { FtlDoc, formatFtlDocMarkdown } from "./ftldoc";
import { getBuiltinRef, getDirectiveRef } from "./reference/freemarkerRef";
import { findDefinitions, FtlIndex, FtlSymbol, identifierAt } from "./symbols";

/** Markdown hover / completion docs for a directive (`#name`). */
export function directiveHover(name: string): string | undefined {
  const ref = getDirectiveRef(name);
  if (ref) {
    return ref.documentation;
  }
  if (DIRECTIVES.includes(name)) {
    return `\`#${name}\` — FreeMarker directive.`;
  }
  return undefined;
}

/** Markdown hover / completion docs for a built-in (`?name`). */
export function builtinHover(name: string): string | undefined {
  const ref = getBuiltinRef(name);
  if (ref) {
    return ref.documentation;
  }
  if (BUILTINS.includes(name)) {
    return `\`?${name}\` — FreeMarker built-in.`;
  }
  return undefined;
}

export function symbolHover(
  name: string,
  kind: string,
  fromImport?: string,
  doc?: FtlDoc
): string {
  return formatFtlDocMarkdown(name, kind, doc, fromImport);
}

/**
 * Symbol Hover Markdown at `offset` (pure; shared by the VS Code Hover
 * provider and the LSP server, plan 0038 AC11): `ns.sym` from
 * `#import … as ns` first, then local definitions (offset-aware, so `#local`
 * scope applies). Undefined when no identifier or no definition.
 */
export function symbolHoverAt(
  text: string,
  offset: number,
  index: FtlIndex,
  importByNs?: ReadonlyMap<string, readonly FtlSymbol[]>
): string | undefined {
  const id = identifierAt(text, offset);
  if (!id) {
    return undefined;
  }
  const parts = id.text.split(".");
  if (parts.length === 2) {
    const [ns, sym] = parts as [string, string];
    const hit = importByNs?.get(ns)?.find((s) => s.name === sym);
    if (hit) {
      const imp = index.pathRefs.find(
        (p) => p.kind === "import" && p.asName === ns
      );
      return symbolHover(id.text, hit.kind, imp?.path, hit.doc);
    }
  }
  const local = findDefinitions(index, id.text, offset)[0];
  if (local) {
    return symbolHover(local.name, local.kind, undefined, local.doc);
  }
  return undefined;
}
