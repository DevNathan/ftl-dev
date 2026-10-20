import type { CompletionCandidate, CompletionContext } from "../catalog";
import {
  DIRECTIVE_CLAUSE_KEYWORDS,
  DIRECTIVE_NAMED_PARAMS,
  directiveParamValueCatalog,
  paramDocumentation,
  paramsForDirective,
} from "../directiveParams";
import type { CompletionProvider } from "./CompletionProvider";
import { filterPrefix } from "./helpers";

function paramDetail(directive: string, name: string): string {
  const clauses = DIRECTIVE_CLAUSE_KEYWORDS[directive];
  if (clauses?.includes(name) && !DIRECTIVE_NAMED_PARAMS[directive]?.includes(name)) {
    return "clause";
  }
  if (directive === "setting") {
    return "setting name";
  }
  return `${directive} parameter`;
}

export class DirectiveParamCompletionProvider implements CompletionProvider {
  supports(ctx: CompletionContext): boolean {
    return ctx.type === "directiveParam";
  }

  provide(ctx: CompletionContext, _env: unknown): CompletionCandidate[] {
    if (ctx.type !== "directiveParam") {
      return [];
    }
    if (ctx.kind === "value") {
      const catalog = directiveParamValueCatalog(
        ctx.directive,
        ctx.paramName ?? ""
      );
      if (!catalog) {
        return [];
      }
      return filterPrefix([...catalog.values], ctx.prefix).map((label) => ({
        label,
        kind: "constant" as const,
        detail: catalog.detail,
        insertText: label,
      }));
    }
    const names = paramsForDirective(ctx.directive);
    return filterPrefix(names, ctx.prefix).map((label) => {
      const isClause =
        DIRECTIVE_CLAUSE_KEYWORDS[ctx.directive]?.includes(label) &&
        !DIRECTIVE_NAMED_PARAMS[ctx.directive]?.includes(label);
      const documentation = paramDocumentation(label);
      return {
        label,
        kind: isClause ? ("directive" as const) : ("property" as const),
        detail: paramDetail(ctx.directive, label),
        insertText: label,
        ...(documentation !== undefined ? { documentation } : {}),
      };
    });
  }
}
