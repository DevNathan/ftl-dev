import type { CompletionContext } from "../catalog";
import type { CompletionEnv, CompletionProvider } from "./CompletionProvider";
import { symbolCandidate } from "./helpers";

export class NsCompletionProvider implements CompletionProvider {
  supports(ctx: CompletionContext): boolean {
    return ctx.type === "ns";
  }

  provide(ctx: CompletionContext, env: CompletionEnv) {
    if (ctx.type !== "ns") {
      return [];
    }
    const head = `${ctx.ns}.`;
    const out: ReturnType<typeof symbolCandidate>[] = [];
    for (const entry of env.symbols) {
      if (!entry.name.startsWith(head)) {
        continue;
      }
      const member = entry.name.slice(head.length);
      if (member.includes(".")) {
        continue;
      }
      if (!member.toLowerCase().startsWith(ctx.prefix.toLowerCase())) {
        continue;
      }
      out.push(symbolCandidate(member, entry.asFunctionCall, `from ${ctx.ns}`));
    }
    return out;
  }
}
