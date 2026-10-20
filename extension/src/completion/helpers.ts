import type { CompletionCandidate, SymbolCompletionEntry } from "../catalog";

export function filterPrefix(names: readonly string[], prefix: string): string[] {
  const p = prefix.toLowerCase();
  if (!p) {
    return [...names];
  }
  return names.filter((n) => n.toLowerCase().startsWith(p));
}

export function asSymbolEntries(
  symbols: readonly SymbolCompletionEntry[] | readonly string[]
): SymbolCompletionEntry[] {
  return symbols.map((s) => (typeof s === "string" ? { name: s } : s));
}

export function symbolCandidate(
  name: string,
  asFunctionCall: boolean | undefined,
  detail: string
): CompletionCandidate {
  if (asFunctionCall) {
    return {
      label: name,
      kind: "symbol",
      detail: detail.includes("function") ? detail : `${detail} (function)`,
      insertText: `${name}($0)`,
      insertAsSnippet: true,
    };
  }
  return {
    label: name,
    kind: "symbol",
    detail,
  };
}
