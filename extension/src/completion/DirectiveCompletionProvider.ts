import { DIRECTIVES } from "../catalogLists";
import { getDirectiveRef } from "../reference/freemarkerRef";
import type { CompletionContext } from "../catalog";
import type { CompletionProvider } from "./CompletionProvider";
import { filterPrefix } from "./helpers";

export class DirectiveCompletionProvider implements CompletionProvider {
  supports(ctx: CompletionContext): boolean {
    return ctx.type === "directive";
  }

  provide(ctx: CompletionContext, _env: unknown) {
    if (ctx.type !== "directive") {
      return [];
    }
    const prefix = ctx.prefix;
    return filterPrefix(DIRECTIVES, prefix).map((label) => {
      const ref = getDirectiveRef(label);
      return {
        label,
        kind: "directive" as const,
        detail: ref?.detail ?? "FreeMarker directive",
        documentation: ref?.documentation,
        insertText: label,
      };
    });
  }
}
