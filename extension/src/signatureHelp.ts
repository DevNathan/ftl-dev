import {
  builtinSignatureOf,
  formatBuiltinSignatureLabel,
} from "./builtinSignatures";
import {
  formatParamDocMarkdown,
  formatSignatureDocMarkdown,
  FtlDoc,
} from "./ftldoc";
import { ftlDocParamRoot } from "./ftldocMarkdown";
import {
  formatSignatureLabel,
  FtlIndex,
  FtlParam,
  FtlSymbol,
  identifierAt,
} from "./symbols";

export type SignatureHelpResult = {
  label: string;
  /** `documentation` is Markdown (ftldoc) when set on a parameter entry. */
  parameters: { label: string; documentation?: string }[];
  activeParameter: number;
  documentation?: string;
  /** True when `documentation` is ftldoc Markdown (plan 0038 D8). */
  documentationMarkdown?: boolean;
};

export type SymbolLookup = {
  local: FtlIndex;
  /** `ns` → symbols from `#import "…" as ns` */
  byNs: Map<string, FtlSymbol[]>;
};

/**
 * Compute signature help at `offset`, or undefined if not inside a known call.
 * Builtin `?name(…)` takes precedence: when detected, only the catalog applies
 * (hit or silence) — never resolve `name` as a user `#function`.
 */
export function signatureHelpAt(
  text: string,
  offset: number,
  lookup: SymbolLookup
): SignatureHelpResult | undefined {
  const builtinSite = findBuiltinCall(text, offset);
  if (builtinSite) {
    return buildBuiltinHelp(builtinSite.name, builtinSite.activeParameter);
  }
  return (
    functionCallHelp(text, offset, lookup) ??
    macroCallHelp(text, offset, lookup)
  );
}

function functionCallHelp(
  text: string,
  offset: number,
  lookup: SymbolLookup
): SignatureHelpResult | undefined {
  const call = findFunctionCall(text, offset);
  if (!call) {
    return undefined;
  }
  const sym = resolveCallee(call.callee, lookup);
  if (!sym || sym.kind !== "function") {
    return undefined;
  }
  return buildHelp(sym.name, sym.params, call.activeParameter, sym.doc);
}

function macroCallHelp(
  text: string,
  offset: number,
  lookup: SymbolLookup
): SignatureHelpResult | undefined {
  const call = findMacroCall(text, offset);
  if (!call) {
    return undefined;
  }
  const sym = resolveCallee(call.callee, lookup);
  if (!sym || sym.kind !== "macro") {
    return undefined;
  }
  let active = call.activeParameter;
  if (call.namedParam) {
    const idx = (sym.params ?? []).findIndex((p) => p.name === call.namedParam);
    active = idx >= 0 ? idx : 0;
  }
  return buildHelp(sym.name, sym.params, active, sym.doc);
}

function buildHelp(
  name: string,
  params: FtlParam[] | undefined,
  activeParameter: number,
  doc?: FtlDoc
): SignatureHelpResult {
  const list = params ?? [];
  // Parameter label stays the declaration's (`name=default`, `name...`);
  // ftldoc only adds Markdown documentation matched by name (D8).
  const parameters = list.map((p) => {
    const label = formatParamLabel(p);
    if (!doc) {
      return { label };
    }
    const own = doc.params.find((d) => d.name === p.name);
    const nested = doc.params.filter(
      (d) => d.name !== p.name && ftlDocParamRoot(d.name) === p.name
    );
    const md = formatParamDocMarkdown(own, nested);
    return md ? { label, documentation: md } : { label };
  });
  const max = Math.max(0, parameters.length - 1);
  const active = parameters.length === 0 ? 0 : Math.min(activeParameter, max);
  const sigDoc = doc ? formatSignatureDocMarkdown(doc) : undefined;
  return {
    label: formatSignatureLabel(name, list),
    parameters,
    activeParameter: active,
    ...(sigDoc
      ? { documentation: sigDoc, documentationMarkdown: true }
      : {
          documentation:
            list.length === 0
              ? undefined
              : `${name} takes ${list.length} parameter${list.length === 1 ? "" : "s"}.`,
        }),
  };
}

function buildBuiltinHelp(
  name: string,
  activeParameter: number
): SignatureHelpResult | undefined {
  const sig = builtinSignatureOf(name);
  if (!sig) {
    return undefined;
  }
  const parameters = sig.parameters.map((label) => ({ label }));
  const max = Math.max(0, parameters.length - 1);
  const active = parameters.length === 0 ? 0 : Math.min(activeParameter, max);
  return {
    label: formatBuiltinSignatureLabel(name, sig.parameters),
    parameters,
    activeParameter: active,
    documentation: sig.documentation,
  };
}

/**
 * Caret inside `?name(…)` argument list — requires `?` immediately before the name.
 */
export function findBuiltinCall(
  text: string,
  offset: number
): { name: string; activeParameter: number } | undefined {
  const openParen = findEnclosingParen(text, offset);
  if (openParen < 0) {
    return undefined;
  }
  let nameEnd = openParen;
  while (nameEnd > 0 && /\s/.test(text[nameEnd - 1]!)) {
    nameEnd--;
  }
  const id = identifierAt(text, nameEnd);
  if (!id || id.end !== nameEnd || id.text.length === 0) {
    return undefined;
  }
  if (id.start === 0 || text[id.start - 1] !== "?") {
    return undefined;
  }
  const activeParameter = countCommaArgs(text, openParen + 1, offset);
  return { name: id.text, activeParameter };
}

function formatParamLabel(p: FtlParam): string {
  let label = p.name;
  if (p.catchAll) {
    label += "...";
  }
  if (p.defaultValue !== undefined) {
    label += `=${p.defaultValue}`;
  }
  return label;
}

export function resolveCallee(
  callee: string,
  lookup: SymbolLookup
): FtlSymbol | undefined {
  const parts = callee.split(".");
  if (parts.length === 2) {
    const [ns, name] = parts as [string, string];
    const hit = lookup.byNs
      .get(ns)
      ?.find(
        (s) =>
          s.name === name && (s.kind === "function" || s.kind === "macro")
      );
    if (hit) {
      return hit;
    }
  }
  const simple = parts[parts.length - 1]!;
  const local = lookup.local.symbols.filter(
    (s) =>
      (s.name === simple || s.name === callee) &&
      (s.kind === "function" || s.kind === "macro")
  );
  return local.find((s) => s.kind === "function") ?? local[0];
}

type CallSite = {
  callee: string;
  activeParameter: number;
  namedParam?: string;
};

/**
 * `${fn(…)}` / `ns.fn(…)` — caret must be inside the argument list parens.
 */
export function findFunctionCall(
  text: string,
  offset: number
): CallSite | undefined {
  const openParen = findEnclosingParen(text, offset);
  if (openParen < 0) {
    return undefined;
  }
  let nameEnd = openParen;
  while (nameEnd > 0 && /\s/.test(text[nameEnd - 1]!)) {
    nameEnd--;
  }
  const id = identifierAt(text, nameEnd);
  if (!id || id.end !== nameEnd) {
    return undefined;
  }
  const before = text.slice(Math.max(0, id.start - 12), id.start);
  if (/[<\[]#\s*(function|macro)\s*$/.test(before)) {
    return undefined;
  }

  const activeParameter = countCommaArgs(text, openParen + 1, offset);
  return { callee: id.text, activeParameter };
}

/**
 * `<@macro …>` / `[@macro …]` — caret inside the open tag after the name.
 */
export function findMacroCall(
  text: string,
  offset: number
): CallSite | undefined {
  const tag = findEnclosingMacroOpen(text, offset);
  if (!tag) {
    return undefined;
  }
  const argsText = text.slice(tag.nameEnd, offset);
  const namedParam = namedParamAtCaret(argsText);
  if (namedParam) {
    return { callee: tag.callee, activeParameter: 0, namedParam };
  }
  return {
    callee: tag.callee,
    activeParameter: countMacroPositionalArgs(argsText),
  };
}

function findEnclosingParen(text: string, offset: number): number {
  let depth = 0;
  let inStr: '"' | "'" | null = null;
  for (let i = offset - 1; i >= 0; i--) {
    const ch = text[i]!;
    if (inStr) {
      if (ch === inStr) {
        let escapes = 0;
        let j = i - 1;
        while (j >= 0 && text[j] === "\\") {
          escapes++;
          j--;
        }
        if (escapes % 2 === 0) {
          inStr = null;
        }
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === ")") {
      depth++;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) {
        return i;
      }
      depth--;
    }
  }
  return -1;
}

function findEnclosingMacroOpen(
  text: string,
  offset: number
): { callee: string; nameEnd: number } | undefined {
  let searchFrom = offset - 1;
  while (searchFrom >= 0) {
    const open = text.lastIndexOf("<@", searchFrom);
    const openSq = text.lastIndexOf("[@", searchFrom);
    const start = Math.max(open, openSq);
    if (start < 0) {
      return undefined;
    }
    const openBracket = text[start]!;
    const closeBracket = openBracket === "[" ? "]" : ">";
    const nameStart = start + 2;
    if (!/[a-zA-Z_]/.test(text[nameStart] ?? "")) {
      searchFrom = start - 1;
      continue;
    }
    let nameEnd = nameStart + 1;
    while (nameEnd < text.length && /[\w.]/.test(text[nameEnd]!)) {
      nameEnd++;
    }
    if (offset < nameEnd) {
      searchFrom = start - 1;
      continue;
    }
    const tagEnd = scanMacroTagEnd(text, nameEnd, closeBracket);
    if (tagEnd !== -1 && offset > tagEnd) {
      searchFrom = start - 1;
      continue;
    }
    return { callee: text.slice(nameStart, nameEnd), nameEnd };
  }
  return undefined;
}

function scanMacroTagEnd(
  text: string,
  from: number,
  closeBracket: ">" | "]"
): number {
  let inStr: '"' | "'" | null = null;
  let paren = 0;
  for (let i = from; i < text.length; i++) {
    const ch = text[i]!;
    if (inStr) {
      if (ch === "\\" && i + 1 < text.length) {
        i++;
        continue;
      }
      if (ch === inStr) {
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === "(") {
      paren++;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren--;
      continue;
    }
    if (ch === closeBracket && paren === 0) {
      return i;
    }
  }
  return -1;
}

/** Comma-separated args; `end` is caret offset. */
export function countCommaArgs(
  text: string,
  from: number,
  end: number
): number {
  let count = 0;
  let inStr: '"' | "'" | null = null;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  for (let i = from; i < end && i < text.length; i++) {
    const ch = text[i]!;
    if (inStr) {
      if (ch === "\\" && i + 1 < text.length) {
        i++;
        continue;
      }
      if (ch === inStr) {
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === "(") {
      paren++;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren--;
      continue;
    }
    if (ch === "{") {
      brace++;
      continue;
    }
    if (ch === "}" && brace > 0) {
      brace--;
      continue;
    }
    if (ch === "[") {
      bracket++;
      continue;
    }
    if (ch === "]" && bracket > 0) {
      bracket--;
      continue;
    }
    if (
      ch === "," &&
      paren === 0 &&
      brace === 0 &&
      bracket === 0
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Positional / mixed macro args before caret.
 * Complete args → next index; mid-token → current index.
 */
export function countMacroPositionalArgs(argsText: string): number {
  const tokens: { start: number; end: number }[] = [];
  let i = 0;
  while (i < argsText.length) {
    while (i < argsText.length && /\s/.test(argsText[i]!)) {
      i++;
    }
    if (i >= argsText.length) {
      break;
    }
    const start = i;
    const named = argsText.slice(i).match(/^([a-zA-Z_][\w]*)\s*=/);
    if (named) {
      i += named[0].length;
      i = skipMacroArgValue(argsText, i);
      tokens.push({ start, end: i });
      continue;
    }
    i = skipMacroArgValue(argsText, i);
    tokens.push({ start, end: i });
  }
  if (tokens.length === 0) {
    return 0;
  }
  const last = tokens[tokens.length - 1]!;
  // Trailing whitespace after a complete token → next param
  if (last.end < argsText.length && /^\s*$/.test(argsText.slice(last.end))) {
    return tokens.length;
  }
  return tokens.length - 1;
}

function skipMacroArgValue(text: string, from: number): number {
  if (from >= text.length) {
    return from;
  }
  const ch0 = text[from]!;
  if (ch0 === '"' || ch0 === "'") {
    const q = ch0;
    let i = from + 1;
    while (i < text.length) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === q) {
        return i + 1;
      }
      i++;
    }
    return text.length;
  }
  let i = from;
  let paren = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "(") {
      paren++;
      i++;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren--;
      i++;
      continue;
    }
    if (/\s/.test(ch) && paren === 0) {
      break;
    }
    i++;
  }
  return i;
}

/**
 * If the caret sits in a `name=value` argument (or on `name=`), return `name`.
 */
export function namedParamAtCaret(argsText: string): string | undefined {
  let i = 0;
  while (i < argsText.length) {
    while (i < argsText.length && /\s/.test(argsText[i]!)) {
      i++;
    }
    if (i >= argsText.length) {
      break;
    }
    const named = argsText.slice(i).match(/^([a-zA-Z_][\w]*)(\s*=)/);
    if (named) {
      const name = named[1]!;
      const valueStart = i + named[0].length;
      const valueEnd = skipMacroArgValue(argsText, valueStart);
      // Caret is at end of argsText: in this named arg if we haven't passed it
      // with only trailing space after a complete value.
      if (argsText.length <= valueEnd) {
        return name;
      }
      if (
        argsText.length > valueEnd &&
        /^\s*$/.test(argsText.slice(valueEnd))
      ) {
        // Complete named arg + trailing space → not "inside" it for highlight;
        // fall through to positional next.
        i = valueEnd;
        continue;
      }
      i = valueEnd;
      continue;
    }
    // Incomplete `name` at end (typing before `=`)
    if (/^[a-zA-Z_][\w]*$/.test(argsText.slice(i))) {
      return argsText.slice(i);
    }
    i = skipMacroArgValue(argsText, i);
  }
  return undefined;
}
