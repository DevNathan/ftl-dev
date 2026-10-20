import { BUILTINS } from "../catalogLists";
import { getBuiltinRef } from "../reference/freemarkerRef";
import type { CompletionContext } from "../catalog";
import type { CompletionProvider } from "./CompletionProvider";
import { filterPrefix } from "./helpers";

export class BuiltinCompletionProvider implements CompletionProvider {
  supports(ctx: CompletionContext): boolean {
    return ctx.type === "builtin";
  }

  provide(ctx: CompletionContext, _env: unknown) {
    if (ctx.type !== "builtin") {
      return [];
    }
    const prefix = ctx.prefix;
    return filterPrefix(BUILTINS, prefix).map((label) => {
      const ref = getBuiltinRef(label);
      return {
        label,
        kind: "builtin" as const,
        detail: ref?.detail ?? "FreeMarker built-in",
        documentation: ref?.documentation,
        insertText: label,
      };
    });
  }
}
