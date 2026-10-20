import { BUILTINS, DIRECTIVES, SPECIAL_VARS } from "./catalogLists";
import { defaultCompletionEngine } from "./completion/defaultEngine";

export { BUILTINS, DIRECTIVES, SPECIAL_VARS };
export {
  camelToSnakeParam,
  DIRECTIVE_CLAUSE_KEYWORDS,
  DIRECTIVE_NAMED_PARAMS,
  DIRECTIVE_PARAM_DOCS,
  hasDirectiveParamCatalog,
  isBooleanDirectiveParam,
  namedParamsWithAliases,
  paramDocumentation,
  paramsForDirective,
  snakeToCamel,
} from "./directiveParams";

export type CompletionKind =
  | "directive"
  | "builtin"
  | "symbol"
  | "property"
  | "constant";

export interface CompletionCandidate {
  label: string;
  kind: CompletionKind;
  /** Text inserted if different from label (optional). */
  insertText?: string;
  /** When true, `insertText` is a snippet (e.g. `twice($0)`). */
  insertAsSnippet?: boolean;
  detail?: string;
  /** Markdown shown in the Ctrl+Space docs panel. */
  documentation?: string;
}

/** Symbol offered in general / ns completion (from `#function` / `#macro` / assigns). */
export interface SymbolCompletionEntry {
  name: string;
  /** User `#function` — insert `name($0)` with caret between parens. */
  asFunctionCall?: boolean;
}

import type { CompletionContext } from "./context/completionContext";
export {
  completionContext,
  isInRecoverBody,
  type CompletionContext,
} from "./context/completionContext";

export function buildCompletions(
  ctx: CompletionContext,
  symbols: readonly SymbolCompletionEntry[] | readonly string[] = []
): CompletionCandidate[] {
  return defaultCompletionEngine.build(ctx, symbols);
}
