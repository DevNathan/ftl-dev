import type {
  CompletionCandidate,
  CompletionContext,
  SymbolCompletionEntry,
} from "../catalog";

export interface CompletionEnv {
  symbols: SymbolCompletionEntry[];
}

export interface CompletionProvider {
  supports(ctx: CompletionContext): boolean;
  provide(ctx: CompletionContext, env: CompletionEnv): CompletionCandidate[];
}
