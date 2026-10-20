import type {
  CompletionCandidate,
  CompletionContext,
  SymbolCompletionEntry,
} from "../catalog";
import type { CompletionProvider } from "./CompletionProvider";
import { asSymbolEntries } from "./helpers";

export class CompletionEngine {
  constructor(private readonly providers: readonly CompletionProvider[]) {}

  build(
    ctx: CompletionContext,
    symbols: readonly SymbolCompletionEntry[] | readonly string[] = []
  ): CompletionCandidate[] {
    const env = { symbols: asSymbolEntries(symbols) };
    const out: CompletionCandidate[] = [];
    for (const provider of this.providers) {
      if (provider.supports(ctx)) {
        out.push(...provider.provide(ctx, env));
      }
    }
    return out;
  }
}
