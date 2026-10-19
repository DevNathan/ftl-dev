import {
  getBuiltinRef,
  getDirectiveRef,
  getSpecialVarRef,
} from "./reference/freemarkerRef";

/** Built-in FreeMarker directive names (angle/square `#` form). */
export const DIRECTIVES: readonly string[] = [
  "assign",
  "attempt",
  "autoesc",
  "break",
  "case",
  "compress",
  "continue",
  "default",
  "else",
  "elseif",
  "escape",
  "fallback",
  "flush",
  "ftl",
  "function",
  "global",
  "if",
  "import",
  "include",
  "items",
  "list",
  "local",
  "lt",
  "macro",
  "nested",
  "noautoesc",
  "noescape",
  "noparse",
  "nt",
  "outputformat",
  "recover",
  "recurse",
  "return",
  "rt",
  "sep",
  "setting",
  "stop",
  "switch",
  "t",
  "transform",
  "visit",
];

/**
 * FreeMarker special variables (`.name` syntax).
 * @see https://freemarker.apache.org/docs/ref_specvar.html
 */
export const SPECIAL_VARS: readonly string[] = [
  "args",
  "auto_esc",
  "caller_template_name",
  "current_template_name",
  "data_model",
  "error",
  "get_optional_template",
  "globals",
  "incompatible_improvements",
  "lang",
  "locale",
  "locale_object",
  "locals",
  "main",
  "main_template_name",
  "namespace",
  "node",
  "now",
  "output_encoding",
  "output_format",
  "pass",
  "template_name",
  "time_zone",
  "url_escaping_charset",
  "vars",
  "version",
];

/** Common `?builtin` names (not exhaustive). */
export const BUILTINS: readonly string[] = [
  "abs",
  "api",
  "boolean",
  "byte",
  "c",
  "cap_first",
  "capitalize",
  "ceiling",
  "children",
  "chop_linebreak",
  "contains",
  "date",
  "datetime",
  "default",
  "double",
  "ends_with",
  "ensure_ends_with",
  "ensure_starts_with",
  "esc",
  "eval",
  "filter",
  "first",
  "float",
  "floor",
  "groups",
  "has_api",
  "has_content",
  "html",
  "index_of",
  "int",
  "interpret",
  "is_boolean",
  "is_collection",
  "is_date",
  "is_date_like",
  "is_directive",
  "is_enumerable",
  "is_hash",
  "is_hash_ex",
  "is_indexable",
  "is_infinite",
  "is_macro",
  "is_markup_output",
  "is_method",
  "is_nan",
  "is_node",
  "is_number",
  "is_sequence",
  "is_string",
  "is_transform",
  "join",
  "js_string",
  "json_string",
  "keep_after",
  "keep_after_last",
  "keep_before",
  "keep_before_last",
  "keys",
  "last",
  "last_index_of",
  "left_pad",
  "length",
  "long",
  "lower_case",
  "map",
  "markup_string",
  "matches",
  "max",
  "min",
  "namespace",
  "new",
  "node_name",
  "node_namespace",
  "node_type",
  "number",
  "number_to_date",
  "number_to_datetime",
  "number_to_time",
  "parent",
  "remove_ending",
  "remove_beginning",
  "replace",
  "reverse",
  "right_pad",
  "root",
  "round",
  "rtf",
  "seq_contains",
  "seq_index_of",
  "seq_last_index_of",
  "sequence",
  "short",
  "size",
  "sort",
  "sort_by",
  "split",
  "starts_with",
  "string",
  "substring",
  "switch",
  "then",
  "time",
  "trim",
  "truncate",
  "uncap_first",
  "upper_case",
  "url",
  "values",
  "web_safe",
  "word_list",
  "xhtml",
  "xml",
];

export type CompletionKind = "directive" | "builtin" | "symbol";

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

export type CompletionContext =
  | { type: "directive"; prefix: string; trigger: "<#" | "[#" }
  | { type: "builtin"; prefix: string }
  | { type: "special"; prefix: string; inRecover: boolean }
  | { type: "ns"; ns: string; prefix: string }
  | { type: "general"; prefix: string };

/** Detect completion context from text before the cursor. */
export function completionContext(before: string): CompletionContext {
  const builtin = before.match(/\?([a-zA-Z_][\w]*)?$/);
  if (builtin) {
    return { type: "builtin", prefix: builtin[1] ?? "" };
  }

  const dir = before.match(/([<\[]#)([a-zA-Z_][\w]*)?$/);
  if (dir) {
    const trigger = dir[1] as "<#" | "[#";
    return { type: "directive", prefix: dir[2] ?? "", trigger };
  }

  // `.error` / `.now` — not `ns.member` (no identifier immediately before `.`).
  const special = before.match(/(?:^|[^a-zA-Z0-9_])\.([a-zA-Z_][\w]*)?$/);
  if (special) {
    return {
      type: "special",
      prefix: special[1] ?? "",
      inRecover: isInRecoverBody(before),
    };
  }

  const ns = before.match(/([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)?$/);
  if (ns) {
    return { type: "ns", ns: ns[1]!, prefix: ns[2] ?? "" };
  }

  const general = before.match(/([a-zA-Z_][\w]*)$/);
  return { type: "general", prefix: general?.[1] ?? "" };
}

/**
 * True when the cursor is in a `#recover` section of an open `#attempt`
 * (where `.error` is defined).
 */
export function isInRecoverBody(before: string): boolean {
  const re = /([<\[]\/?)#([a-zA-Z_][\w]*)\b/g;
  const stack: { recover: boolean }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) {
    const isClose = m[1]!.includes("/");
    const name = m[2]!;
    if (name === "attempt") {
      if (isClose) {
        stack.pop();
      } else {
        stack.push({ recover: false });
      }
    } else if (name === "recover" && !isClose && stack.length > 0) {
      stack[stack.length - 1]!.recover = true;
    }
  }
  const top = stack[stack.length - 1];
  return top !== undefined && top.recover;
}

function filterPrefix(names: readonly string[], prefix: string): string[] {
  const p = prefix.toLowerCase();
  if (!p) {
    return [...names];
  }
  return names.filter((n) => n.toLowerCase().startsWith(p));
}

function asSymbolEntries(
  symbols: readonly SymbolCompletionEntry[] | readonly string[]
): SymbolCompletionEntry[] {
  return symbols.map((s) => (typeof s === "string" ? { name: s } : s));
}

export function buildCompletions(
  ctx: CompletionContext,
  symbols: readonly SymbolCompletionEntry[] | readonly string[] = []
): CompletionCandidate[] {
  const entries = asSymbolEntries(symbols);

  if (ctx.type === "directive") {
    return filterPrefix(DIRECTIVES, ctx.prefix).map((label) => {
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

  if (ctx.type === "builtin") {
    return filterPrefix(BUILTINS, ctx.prefix).map((label) => {
      const ref = getBuiltinRef(label);
      return {
        label,
        kind: "builtin" as const,
        detail: ref?.detail ?? "FreeMarker built-in",
        documentation: ref?.documentation,
        insertText: label,
      };
    });
  }

  if (ctx.type === "special") {
    let names = filterPrefix(SPECIAL_VARS, ctx.prefix);
    // `.error` exists only inside `#recover`.
    if (!ctx.inRecover) {
      names = names.filter((n) => n !== "error");
    }
    return names.map((label) => {
      const ref = getSpecialVarRef(label);
      return {
        label,
        kind: "symbol" as const,
        detail: ref?.detail ?? "FreeMarker special variable",
        documentation: ref?.documentation,
        insertText: label,
      };
    });
  }

  if (ctx.type === "ns") {
    const head = `${ctx.ns}.`;
    const out: CompletionCandidate[] = [];
    for (const entry of entries) {
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

  const out: CompletionCandidate[] = [];
  const seen = new Set<string>();
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
        name.includes(".") ? "imported FTL symbol" : "FTL symbol"
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

function symbolCandidate(
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
