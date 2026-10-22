import type { CompletionCandidate, SymbolCompletionEntry } from "../catalog";
import { formatFtlDocMarkdown } from "../ftldocMarkdown";
import type { FtlIndex, FtlSymbol } from "../symbols";

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
  detail: string,
  documentation?: string
): CompletionCandidate {
  const doc = documentation ? { documentation } : {};
  if (asFunctionCall) {
    return {
      label: name,
      kind: "symbol",
      detail: detail.includes("function") ? detail : `${detail} (function)`,
      insertText: `${name}($0)`,
      insertAsSnippet: true,
      ...doc,
    };
  }
  return {
    label: name,
    kind: "symbol",
    detail,
    ...doc,
  };
}

/**
 * One completion entry per symbol name (local, then `ns.name` from
 * `#import … as ns`). `asFunctionCall` when any same-name declaration is a
 * `#function`; `documentation` = ftldoc Markdown of the first same-name
 * declaration with a doc, a `#function` preferred (plan 0038 G32). Shared by
 * the VS Code provider and the LSP server.
 */
export function symbolCompletionEntries(
  index: FtlIndex,
  importByNs?: ReadonlyMap<string, readonly FtlSymbol[]>
): SymbolCompletionEntry[] {
  const byName = new Map<
    string,
    { entry: SymbolCompletionEntry; docFrom?: FtlSymbol }
  >();
  const add = (label: string, s: FtlSymbol, fromImport?: string): void => {
    const prev = byName.get(label);
    const asFunctionCall =
      s.kind === "function" || prev?.entry.asFunctionCall || undefined;
    let docFrom = prev?.docFrom;
    if (s.doc && (!docFrom || (docFrom.kind !== "function" && s.kind === "function"))) {
      docFrom = s;
    }
    const entry: SymbolCompletionEntry = {
      name: label,
      ...(asFunctionCall ? { asFunctionCall } : {}),
    };
    if (docFrom?.doc) {
      entry.documentation = formatFtlDocMarkdown(
        label,
        docFrom.kind,
        docFrom.doc,
        fromImport
      );
    }
    byName.set(label, { entry, docFrom });
  };
  for (const s of index.symbols) {
    add(s.name, s);
  }
  for (const [ns, syms] of importByNs ?? []) {
    const imp = index.pathRefs.find(
      (p) => p.kind === "import" && p.asName === ns
    );
    for (const s of syms) {
      add(`${ns}.${s.name}`, s, imp?.path);
    }
  }
  return [...byName.values()].map((v) => v.entry);
}
