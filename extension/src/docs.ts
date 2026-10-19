import { BUILTINS, DIRECTIVES } from "./catalog";
import { FtlDoc, formatFtlDocMarkdown } from "./ftldoc";
import { getBuiltinRef, getDirectiveRef } from "./reference/freemarkerRef";

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
