import type { CompletionCandidate, CompletionContext } from "../catalog";
import { DIRECTIVES } from "../catalogLists";
import { getDirectiveRef } from "../reference/freemarkerRef";
import type { CompletionEnv, CompletionProvider } from "./CompletionProvider";
import { filterPrefix, symbolCandidate } from "./helpers";

export class GeneralSymbolCompletionProvider implements CompletionProvider {
  supports(ctx: CompletionContext): boolean {
    return ctx.type === "general";
  }

  provide(ctx: CompletionContext, env: CompletionEnv) {
    if (ctx.type !== "general") {
      return [];
    }
    const out: CompletionCandidate[] = [];
    const seen = new Set<string>();
    const entries = env.symbols;
    const matched = filterPrefix(
      entries.map((e) => e.name),
      ctx.prefix
    );
    const byName = new Map(entries.map((e) => [e.name, e]));

    for (const name of matched) {
      seen.add(name);
      const entry = byName.get(name)!;
      out.push(
        symbolCandidate(
          name,
          entry.asFunctionCall,
          name.includes(".") ? "imported FTL symbol" : "FTL symbol",
          entry.documentation
        )
      );
    }

    if (ctx.prefix.length >= 1) {
      for (const label of filterPrefix(DIRECTIVES, ctx.prefix)) {
        if (seen.has(label)) {
          continue;
        }
        const ref = getDirectiveRef(label);
        out.push({
          label: `#${label}`,
          kind: "directive",
          detail: ref?.detail ?? "FreeMarker directive",
          documentation: ref?.documentation,
          insertText: `<#${label}`,
        });
      }
    }

    return out;
  }
}
