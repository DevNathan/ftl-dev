import { SPECIAL_VARS } from "../catalogLists";
import { getSpecialVarRef } from "../reference/freemarkerRef";
import type { CompletionContext } from "../catalog";
import type { CompletionProvider } from "./CompletionProvider";
import { filterPrefix } from "./helpers";

export class SpecialVarCompletionProvider implements CompletionProvider {
  supports(ctx: CompletionContext): boolean {
    return ctx.type === "special";
  }

  provide(ctx: CompletionContext, _env: unknown) {
    if (ctx.type !== "special") {
      return [];
    }
    const prefix = ctx.prefix;
    let names = filterPrefix(SPECIAL_VARS, prefix);
    if (!ctx.inRecover) {
      names = names.filter((n) => n !== "error");
    }
    return names.map((label) => {
      const ref = getSpecialVarRef(label);
      return {
        label,
        kind: "symbol" as const,
        detail: ref?.detail ?? "FreeMarker special variable",
        documentation: ref?.documentation,
        insertText: label,
      };
    });
  }
}
