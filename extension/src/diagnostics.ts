import { DIRECTIVES } from "./catalog";
import { findCommentDelimiterIssues, ftlCommentRanges, skipFtlComment } from "./comments";
import { namedParamsWithAliases } from "./directiveParams";
import { buildLineMap, offsetToPos } from "./lineMap";
import { scanNamedParamLhs } from "./namedParamLhs";
import { findNameOccurrences } from "./references";
import {
  findMatchingBrace,
  isFtlCommentStart,
  matchDirectiveHead,
  scanDirectiveClose,
  skipCommentAt,
  skipString,
} from "./scan";
import { findUndeclaredIdentifierIssues } from "./strictVariables";
import { findDefinitions, indexFtl } from "./symbols";

/** Directives that support named `name=` params with a catalog. */
const NAMED_PARAM_DIRECTIVES = new Set(["ftl", "setting", "include"]);

/** Clause keywords — never reported as unknown named params. */
const CLAUSE_KEYWORD_DENY = new Set(["as", "in", "using"]);

export type FtlDiagnostic = {
  offset: number;
  length: number;
  message: string;
  severity: "error" | "warning" | "information";
};

const KNOWN_DIRECTIVES = new Set(DIRECTIVES);

/**
 * Warn when a name that resolves to an ftldoc-`@deprecated` symbol is used
 * (not on the declaration name span itself). Respects `#local` scope via
 * `findDefinitions(…, atOffset)`.
 */
export function findDeprecatedUsageIssues(
  text: string,
  index: ReturnType<typeof indexFtl> = indexFtl(text)
): FtlDiagnostic[] {
  const deprecated = index.symbols.filter(
    (s) => s.doc?.deprecated !== undefined
  );
  if (deprecated.length === 0) {
    return [];
  }

  const comments = ftlCommentRanges(text);
  const declOffsets = new Set(index.symbols.map((s) => s.nameOffset));
  const names = new Set(deprecated.map((s) => s.name));
  const seen = new Set<string>();
  const diags: FtlDiagnostic[] = [];

  for (const name of names) {
    for (const hit of findNameOccurrences(text, name, comments)) {
      if (declOffsets.has(hit.startOffset)) {
        continue;
      }
      const defs = findDefinitions(index, name, hit.startOffset);
      const preferred = defs[0];
      if (!preferred || preferred.doc?.deprecated === undefined) {
        continue;
      }
      const key = `${hit.startOffset}:${hit.endOffset}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      // Multi-line @deprecated (plan 0038 AC13): collapse whitespace runs.
      const dep = preferred.doc.deprecated.replace(/\s+/g, " ").trim();
      diags.push({
        offset: hit.startOffset,
        length: hit.endOffset - hit.startOffset,
        message: dep
          ? `Deprecated: ${dep}`
          : `'${preferred.name}' is deprecated`,
        severity: "warning",
      });
    }
  }

  diags.sort((a, b) => a.offset - b.offset);
  return diags;
}

/**
 * ftldoc `@param` checks on documented `#function` / `#macro` symbols (plan
 * 0038 D7): a `@param` whose root name (before the first `.`, `[…]` already
 * stripped by the parser) is not a declared parameter (catch-all `args...`
 * counts as `args`), and a repeated `@param` with the same full name. Severity
 * Information; range = the name inside the comment. `#assign` / `#local` /
 * `#global` docs are not checked.
 */
export function findFtldocParamIssues(
  index: ReturnType<typeof indexFtl>
): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  for (const sym of index.symbols) {
    if ((sym.kind !== "function" && sym.kind !== "macro") || !sym.doc) {
      continue;
    }
    const declared = new Set((sym.params ?? []).map((p) => p.name));
    const seen = new Set<string>();
    for (const p of sym.doc.params) {
      if (p.nameOffset === undefined) {
        continue;
      }
      const dot = p.name.indexOf(".");
      const root = dot === -1 ? p.name : p.name.slice(0, dot);
      if (!declared.has(root)) {
        diags.push({
          offset: p.nameOffset,
          length: p.name.length,
          message: `ftldoc @param '${p.name}' does not match a parameter of '${sym.name}'`,
          severity: "information",
        });
      } else if (seen.has(p.name)) {
        diags.push({
          offset: p.nameOffset,
          length: p.name.length,
          message: `Duplicate ftldoc @param '${p.name}'`,
          severity: "information",
        });
      }
      seen.add(p.name);
    }
  }
  return diags;
}

/**
 * Lightweight FreeMarker checks (not a full parser).
 * Catches common mistakes like `${boo?}` (dangling built-in operator).
 */
export type ValidateFtlOptions = {
  /** Reuse a cached index (avoids a second `indexFtl` for deprecated-usage). */
  index?: ReturnType<typeof indexFtl>;
  /** Opt-in undeclared-root warnings (ADR 0002 layer B). Default false. */
  strictVariables?: boolean;
  /** Host-injected top-level names when strictVariables is on. */
  dataModel?: readonly string[];
  /**
   * ftldoc `@param` name checks (Information). Default true; VS Code setting
   * `ftl-dev.ftldoc.validateParams`.
   */
  ftldocParams?: boolean;
};

export function validateFtl(
  text: string,
  options: ValidateFtlOptions = {}
): FtlDiagnostic[] {
  const out: FtlDiagnostic[] = [];
  let inString: '"' | "'" | null = null;
  let i = 0;

  while (i < text.length) {
    // FTL comment <#-- … --> / [#-- … --] (nested)
    if (
      !inString &&
      (text.startsWith("<#--", i) || text.startsWith("[#--", i))
    ) {
      i = skipFtlComment(text, i);
      continue;
    }

    // HTML comment — skip
    if (!inString && text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i + 4);
      i = end === -1 ? text.length : end + 3;
      continue;
    }

    const ch = text[i]!;

    if (inString) {
      if (ch === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      i++;
      continue;
    }

    // Dangling ? (not ??) — must be followed by builtin identifier
    if (ch === "?") {
      const next = text[i + 1];
      if (next === "?") {
        // existential ??
        i += 2;
        continue;
      }
      if (next && /[a-zA-Z_]/.test(next)) {
        // valid ?builtin start
        i++;
        continue;
      }
      // allow ?.  — not FreeMarker; still flag as dangling unless we want to ignore
      out.push({
        offset: i,
        length: 1,
        message:
          "Expected a built-in name after '?' (e.g. ?c, ?has_content). Use '??' to test for missing values.",
        severity: "error",
      });
      i++;
      continue;
    }

    i++;
  }

  // Unclosed ${ ... }
  out.push(...findUnclosedInterpolations(text));

  // Unmatched comment delimiters (unclosed `<#--` / orphan `-->`)
  for (const issue of findCommentDelimiterIssues(text)) {
    if (issue.kind === "unclosed-open") {
      out.push({
        offset: issue.offset,
        length: 4,
        message: issue.angle
          ? "Unclosed FreeMarker comment; expected '-->'."
          : "Unclosed FreeMarker comment; expected '--]'.",
        severity: "error",
      });
    } else {
      out.push({
        offset: issue.offset,
        length: 3,
        message: issue.angle
          ? "Unexpected '-->'; no matching '<#--'."
          : "Unexpected '--]'; no matching '[#--'.",
        severity: "error",
      });
    }
  }

  out.push(...findDirectiveIssues(text));
  out.push(...findSwitchIssues(text));
  out.push(...findUnknownDirectiveParamIssues(text));
  out.push(...findHashLiteralCommaIssues(text));
  const index = options.index ?? indexFtl(text);
  out.push(...findDeprecatedUsageIssues(text, index));
  if (options.ftldocParams !== false) {
    out.push(...findFtldocParamIssues(index));
  }
  out.push(
    ...findUndeclaredIdentifierIssues(text, {
      strictVariables: options.strictVariables,
      dataModel: options.dataModel,
      index,
    })
  );

  return out;
}

const BLOCK_DIRECTIVES = new Set([
  "if",
  "list",
  "macro",
  "function",
  "attempt",
  "compress",
  "escape",
  "noescape",
  "autoesc",
  "noautoesc",
  "transform",
  "switch",
  "items",
  "noparse",
  "outputformat",
]);

/** May be short (`<#assign x=1>`) or capture-block (`<#assign x>…</#assign>`). */
const CAPTURE_ASSIGN_DIRECTIVES = new Set(["assign", "local", "global"]);

type DirTok = {
  offset: number;
  length: number;
  sigil: "#" | "@";
  name: string;
  kind: "open" | "close" | "empty";
  selfClose: boolean;
  /** Inner text between name and close bracket */
  inner: string;
  /** Absolute offset of `inner` in the full document. */
  innerStart: number;
  bracket: "<" | "[";
};

/**
 * Warn on unknown `name=` LHS for `#ftl` / `#setting` / `#include`.
 * String-, comment-, and nesting-aware; never flags values or clause keywords.
 */
export function findUnknownDirectiveParamIssues(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  for (const tok of scanDirectives(text)) {
    if (tok.sigil !== "#" || tok.kind === "close") {
      continue;
    }
    if (!NAMED_PARAM_DIRECTIVES.has(tok.name)) {
      continue;
    }
    const known = new Set(namedParamsWithAliases(tok.name));
    for (const hit of scanNamedParamLhs(tok.inner)) {
      if (CLAUSE_KEYWORD_DENY.has(hit.name)) {
        continue;
      }
      if (known.has(hit.name)) {
        continue;
      }
      diags.push({
        offset: tok.innerStart + hit.relOffset,
        length: hit.name.length,
        message: unknownParamMessage(tok.name, hit.name),
        severity: "warning",
      });
    }
  }
  diags.sort((a, b) => a.offset - b.offset);
  return diags;
}

function unknownParamMessage(directive: string, name: string): string {
  if (directive === "setting") {
    return `Unknown setting name '${name}'.`;
  }
  return `Unknown parameter '${name}' for '#${directive}'.`;
}

function findDirectiveIssues(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  const tokens = scanDirectives(text);

  // Unclosed open-tag (started <#name but never saw > or ])
  diags.push(...findUnclosedDirectiveOpens(text));

  const stack: DirTok[] = [];
  /** Offsets of `#if` / `#list` opens that already have an `#else`. */
  const elseSeenForIf = new Set<number>();
  /** `#list` opens without `as` (items form) that have seen their `#items`. */
  const listHasItems = new Set<number>();
  const listItemsIssue = (open: DirTok): FtlDiagnostic => ({
    offset: open.offset,
    length: open.length,
    message: `'#list' without 'as' needs an '#items' inside (or use <#list seq as x>).`,
    severity: "error",
  });
  const needsItems = (open: DirTok): boolean =>
    open.name === "list" &&
    !/\bas\b/.test(open.inner) &&
    !listHasItems.has(open.offset);

  for (const tok of tokens) {
    // `<#noparse>` body is literal text: ignore everything until its close.
    const top = stack[stack.length - 1];
    if (
      top?.name === "noparse" &&
      !(tok.sigil === "#" && tok.kind === "close" && tok.name === "noparse")
    ) {
      continue;
    }

    if (tok.sigil === "@") {
      // user macros: only track non-self-close open/close for mismatch later if needed
      continue;
    }

    if (!KNOWN_DIRECTIVES.has(tok.name)) {
      diags.push({
        offset: tok.offset,
        length: tok.length,
        message: `Unknown directive '#${tok.name}'.`,
        severity: "error",
      });
      // Still process structure below so mismatch/unclosed stay useful.
    }

    if (tok.name === "elseif") {
      const parentIf = findStackDir(stack, "if");
      if (!parentIf) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `'#elseif' without an enclosing '#if'.`,
          severity: "error",
        });
      }
      if (!tok.inner.trim()) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `'#elseif' requires a condition expression.`,
          severity: "error",
        });
      }
      continue;
    }

    if (tok.name === "else") {
      // `#else` belongs to the nearest `#if` or `#list` (empty-list branch).
      const parentIf = findStackDirAny(stack, ["if", "list"]);
      if (!parentIf) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `'#else' without an enclosing '#if'.`,
          severity: "error",
        });
      } else if (elseSeenForIf.has(parentIf.offset)) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `Duplicate '#else' in the same '#${parentIf.name}'.`,
          severity: "error",
        });
      } else {
        elseSeenForIf.add(parentIf.offset);
      }
      continue;
    }

    if (tok.kind === "close" && tok.name === "sep") {
      // `<#sep>` may be closed explicitly or implicitly; both are valid.
      continue;
    }

    if (tok.name === "items" && tok.kind !== "close") {
      const parentList = findStackDir(stack, "list");
      if (parentList) {
        listHasItems.add(parentList.offset);
      }
    }

    if (tok.kind === "close") {
      let matched = false;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i]!.name === tok.name) {
          if (needsItems(stack[i]!)) {
            diags.push(listItemsIssue(stack[i]!));
          }
          stack.splice(i, 1);
          matched = true;
          break;
        }
      }
      if (!matched) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message: `Unexpected '</#${tok.name}>': no matching '#${tok.name}'.`,
          severity: "error",
        });
      }
      continue;
    }

    // `#list` without `as` is the items form; checked when the list closes.

    if (tok.name === "local" && macroFunctionDepth(stack) === 0) {
      diags.push({
        offset: tok.offset,
        length: tok.length,
        message:
          `'#local' is only valid inside a '#macro' or '#function' definition.`,
        severity: "error",
      });
    }

    if (tok.selfClose || tok.kind === "empty") {
      continue;
    }

    if (isBlockDirectiveOpen(tok)) {
      if (
        (tok.name === "macro" || tok.name === "function") &&
        macroFunctionDepth(stack) >= 1
      ) {
        diags.push({
          offset: tok.offset,
          length: tok.length,
          message:
            "Macro or function definitions can't be nested into each other.",
          severity: "error",
        });
      }
      stack.push(tok);
    }
  }

  for (const open of stack) {
    diags.push({
      offset: open.offset,
      length: open.length,
      message: `Unclosed '#${open.name}'; expected '</#${open.name}>'.`,
      severity: "error",
    });
  }

  return diags;
}

function isBlockDirectiveOpen(tok: DirTok): boolean {
  if (BLOCK_DIRECTIVES.has(tok.name)) {
    return true;
  }
  if (!CAPTURE_ASSIGN_DIRECTIVES.has(tok.name)) {
    return false;
  }
  // Capture form: no `=` / `++` / `+=` … in the open tag.
  // `<#assign x>` / `<#assign x in ns>` / bare `<#assign>` (still paired with `</#assign>`).
  const inner = tok.inner.replace(/\/\s*$/, "").trim();
  return !/(=|\+\+|--|\+=|-=|\*=|\/=|%=)/.test(inner);
}

/** Open `#macro` / `#function` blocks on the directive stack (ignores `@` calls). */
function macroFunctionDepth(stack: DirTok[]): number {
  let depth = 0;
  for (const t of stack) {
    if (t.name === "macro" || t.name === "function") {
      depth++;
    }
  }
  return depth;
}

/** Nearest enclosing open on the stack with the given name (top → bottom). */
function findStackDir(stack: DirTok[], name: string): DirTok | undefined {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]!.name === name) {
      return stack[i];
    }
  }
  return undefined;
}

/** Matches an intentional fall-through marker comment (`<#-- falls through -->`). */
const FALLTHROUGH_MARKER = /\bfall(?:s|-)?\s*through\b/i;
const FTL_COMMENT_RE = /<#--[\s\S]*?-->|\[#--[\s\S]*?--\]/g;

type SwitchBranch = {
  tok: DirTok;
  /** Branch body has output or directives. */
  content: boolean;
  /** Body ends with `#break` / `#return` / `#stop` at switch level. */
  terminated: boolean;
  /** An FTL comment in the body says the fall-through is intended. */
  marker: boolean;
};

type SwitchFrame = {
  /** Directive stack depth right inside this `#switch`. */
  depth: number;
  /** `case` or `on` — whichever branch form appeared first. */
  kind?: "case" | "on";
  branch?: SwitchBranch;
};

/**
 * `#switch` checks:
 * - mixing `#on` (2.3.34+) and `#case` in one `#switch` (FreeMarker rejects it);
 * - a non-empty `#case` / `#default` body that falls through into the next
 *   branch without `#break` / `#return` / `#stop` (warning, like JetBrains'
 *   "fallthrough in switch"). Empty bodies (`<#case 1><#case 2>…`) group values
 *   and are fine; a comment containing "falls through" marks it intentional.
 *   `#on` branches never fall through.
 */
export function findSwitchIssues(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  const stack: DirTok[] = [];
  const switches: SwitchFrame[] = [];
  let prevEnd = 0;

  const fallThrough = (sw: SwitchFrame): void => {
    const b = sw.branch;
    if (
      sw.kind === "case" &&
      b &&
      b.content &&
      !b.terminated &&
      !b.marker
    ) {
      diags.push({
        offset: b.tok.offset,
        length: b.tok.length,
        message: `'#${b.tok.name}' falls through to the next branch; add '<#break>' (or a '<#-- falls through -->' comment if intended).`,
        severity: "warning",
      });
    }
  };

  for (const tok of scanDirectives(text)) {
    const top = stack[stack.length - 1];
    if (
      top?.name === "noparse" &&
      !(tok.sigil === "#" && tok.kind === "close" && tok.name === "noparse")
    ) {
      continue;
    }

    const sw = switches[switches.length - 1];
    const gap = text.slice(prevEnd, tok.offset);
    prevEnd = tok.offset + tok.length;
    if (sw?.branch) {
      if (FALLTHROUGH_MARKER.test(gap) && /<#--|\[#--/.test(gap)) {
        sw.branch.marker = true;
      }
      if (gap.replace(FTL_COMMENT_RE, "").trim()) {
        sw.branch.content = true;
        sw.branch.terminated = false;
      }
    }

    const atSwitchLevel = sw !== undefined && stack.length === sw.depth;
    const isHash = tok.sigil === "#";

    if (
      atSwitchLevel &&
      isHash &&
      tok.kind !== "close" &&
      (tok.name === "case" || tok.name === "on" || tok.name === "default")
    ) {
      if (tok.name !== "default") {
        if (sw.kind && sw.kind !== tok.name) {
          diags.push({
            offset: tok.offset,
            length: tok.length,
            message: `Don't mix '#on' and '#case' in the same '#switch'; use only one form ('#on' needs no '#break').`,
            severity: "error",
          });
        } else {
          sw.kind = tok.name as "case" | "on";
        }
      }
      fallThrough(sw);
      sw.branch = { tok, content: false, terminated: false, marker: false };
      continue;
    }

    if (sw?.branch && stack.length >= sw.depth) {
      if (
        atSwitchLevel &&
        isHash &&
        tok.kind !== "close" &&
        (tok.name === "break" || tok.name === "return" || tok.name === "stop")
      ) {
        sw.branch.terminated = true;
      } else {
        sw.branch.content = true;
        sw.branch.terminated = false;
      }
    }

    if (!isHash) {
      continue;
    }
    if (tok.kind === "close") {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i]!.name === tok.name) {
          if (tok.name === "switch") {
            switches.pop();
          }
          stack.length = i;
          break;
        }
      }
      continue;
    }
    if (!tok.selfClose && tok.kind !== "empty" && isBlockDirectiveOpen(tok)) {
      stack.push(tok);
      if (tok.name === "switch") {
        switches.push({ depth: stack.length });
      }
    }
  }
  return diags;
}

/** Nearest enclosing open on the stack whose name is one of `names`. */
function findStackDirAny(
  stack: DirTok[],
  names: string[]
): DirTok | undefined {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (names.includes(stack[i]!.name)) {
      return stack[i];
    }
  }
  return undefined;
}

/** `<#assign` … EOF without `>` / `/>` */
function findUnclosedDirectiveOpens(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  while (i < text.length) {
    if (
      !inString &&
      (text.startsWith("<#--", i) || text.startsWith("[#--", i))
    ) {
      i = skipFtlComment(text, i);
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    const head = matchDirectiveHead(text, i);
    if (!head) {
      i++;
      continue;
    }

    const start = i;
    const openCh = head.bracket;
    const closeCh = openCh === "[" ? "]" : ">";
    i += head.length;

    // scan until close bracket (respect strings / paren depth) or HTML / next FTL tag
    let closed = false;
    let paren = 0;
    let brace = 0;
    while (i < text.length) {
      if (
        !inString &&
        (text.startsWith("<#--", i) || text.startsWith("[#--", i))
      ) {
        i = skipFtlComment(text, i);
        continue;
      }
      const c = text[i]!;
      if (inString) {
        if (c === "\\" && i + 1 < text.length) {
          i += 2;
          continue;
        }
        if (c === inString) {
          inString = null;
        }
        i++;
        continue;
      }
      if (c === '"' || c === "'") {
        inString = c;
        i++;
        continue;
      }
      if (c === "(") {
        paren++;
        i++;
        continue;
      }
      if (c === ")" && paren > 0) {
        paren--;
        i++;
        continue;
      }
      if (c === "{") {
        brace++;
        i++;
        continue;
      }
      if (c === "}" && brace > 0) {
        brace--;
        i++;
        continue;
      }
      // HTML tag or another FTL directive before this one closed
      // (`..<` is the exclusive range operator, not a tag start).
      if ((c === "<" && !text.startsWith("..", i - 2)) || c === "[") {
        const rest = text.slice(i);
        if (
          rest.startsWith("<#") ||
          rest.startsWith("</#") ||
          rest.startsWith("<@") ||
          rest.startsWith("</@") ||
          rest.startsWith("[#") ||
          rest.startsWith("[/#") ||
          rest.startsWith("[@") ||
          rest.startsWith("[/@") ||
          /^<\/?[a-zA-Z]/.test(rest)
        ) {
          break;
        }
      }
      if (c === closeCh && paren === 0 && brace === 0) {
        closed = true;
        i++;
        break;
      }
      i++;
    }

    if (!closed) {
      diags.push({
        offset: start,
        length: Math.min(head.length, text.length - start),
        message: `Unclosed directive tag; expected '${closeCh}' or '/${closeCh}'.`,
        severity: "error",
      });
    }
  }

  return diags;
}

function scanDirectives(text: string): DirTok[] {
  const tokens: DirTok[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  while (i < text.length) {
    if (
      !inString &&
      (text.startsWith("<#--", i) || text.startsWith("[#--", i))
    ) {
      i = skipFtlComment(text, i);
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    const head = matchDirectiveHead(text, i);
    if (!head) {
      i++;
      continue;
    }

    const start = i;
    const bracket = head.bracket;
    const isClose = head.isClose;
    const sigil = head.sigil;
    const name = head.name;
    const closeCh = bracket === "[" ? "]" : ">";
    i += head.length;

    const innerStart = i;
    let closed = false;
    let paren = 0;
    let brace = 0;
    while (i < text.length) {
      if (
        !inString &&
        (text.startsWith("<#--", i) || text.startsWith("[#--", i))
      ) {
        i = skipFtlComment(text, i);
        continue;
      }
      const c = text[i]!;
      if (inString) {
        if (c === "\\" && i + 1 < text.length) {
          i += 2;
          continue;
        }
        if (c === inString) {
          inString = null;
        }
        i++;
        continue;
      }
      if (c === '"' || c === "'") {
        inString = c;
        i++;
        continue;
      }
      if (c === "(") {
        paren++;
        i++;
        continue;
      }
      if (c === ")" && paren > 0) {
        paren--;
        i++;
        continue;
      }
      if (c === "{") {
        brace++;
        i++;
        continue;
      }
      if (c === "}" && brace > 0) {
        brace--;
        i++;
        continue;
      }
      // Nested `[`…`]` inside angle-bracket tags (e.g. <#list [1,2,3] as i>)
      if (c === "[" && bracket === "<" && paren === 0 && brace === 0) {
        let depth = 1;
        i++;
        while (i < text.length && depth > 0) {
          const sc = text[i]!;
          if (inString) {
            if (sc === "\\" && i + 1 < text.length) {
              i += 2;
              continue;
            }
            if (sc === inString) {
              inString = null;
            }
            i++;
            continue;
          }
          if (sc === '"' || sc === "'") {
            inString = sc;
            i++;
            continue;
          }
          if (sc === "[") {
            depth++;
          } else if (sc === "]") {
            depth--;
          }
          i++;
        }
        continue;
      }
      if (c === closeCh && paren === 0 && brace === 0) {
        closed = true;
        break;
      }
      // Bail if another tag starts before close (same as unclosed-open scanner)
      if (
        ((c === "<" && !text.startsWith("..", i - 2)) || c === "[") &&
        paren === 0 &&
        brace === 0
      ) {
        const rest = text.slice(i);
        if (
          rest.startsWith("<#") ||
          rest.startsWith("</#") ||
          rest.startsWith("<@") ||
          rest.startsWith("</@") ||
          rest.startsWith("[#") ||
          rest.startsWith("[/#") ||
          rest.startsWith("[@") ||
          rest.startsWith("[/@") ||
          /^<\/?[a-zA-Z]/.test(rest)
        ) {
          break;
        }
      }
      i++;
    }

    if (!closed) {
      // Leave for findUnclosedDirectiveOpens; do not emit a partial token.
      continue;
    }

    const inner = text.slice(innerStart, i);
    const selfClose = /\/\s*$/.test(inner);
    i++; // consume close bracket
    tokens.push({
      offset: start,
      length: i - start,
      sigil,
      name,
      kind: isClose ? "close" : "open",
      selfClose,
      inner,
      innerStart,
      bracket,
    });
  }

  return tokens;
}

function findUnclosedInterpolations(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  while (i < text.length) {
    if (
      !inString &&
      (text.startsWith("<#--", i) || text.startsWith("[#--", i))
    ) {
      i = skipFtlComment(text, i);
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    if (text.startsWith("${", i)) {
      const start = i;
      i += 2;
      let depth = 1;
      let found = false;
      while (i < text.length) {
        if (
          !inString &&
          (text.startsWith("<#--", i) || text.startsWith("[#--", i))
        ) {
          const next = skipFtlComment(text, i);
          if (next <= i) {
            break;
          }
          i = next;
          continue;
        }
        const c = text[i]!;
        if (inString) {
          if (c === "\\" && i + 1 < text.length) {
            i += 2;
            continue;
          }
          if (c === inString) {
            inString = null;
          }
          i++;
          continue;
        }
        if (c === '"' || c === "'") {
          inString = c;
          i++;
          continue;
        }
        if (c === "{") {
          depth++;
        } else if (c === "}") {
          depth--;
          if (depth === 0) {
            found = true;
            i++;
            break;
          }
        }
        i++;
      }
      if (!found) {
        diags.push({
          offset: start,
          length: 2,
          message: "Unclosed interpolation; expected '}'.",
          severity: "error",
        });
      } else {
        const inner = text.slice(start + 2, i - 1);
        if (!inner.trim()) {
          diags.push({
            offset: start,
            length: i - start,
            message: "Empty interpolation '${}'.",
            severity: "error",
          });
        }
      }
      continue;
    }

    i++;
  }

  return diags;
}

/**
 * Hash literals `{ "k": v, ... }` — commas between entries are required;
 * a trailing comma before `}` is a syntax error (FreeMarker).
 * Only checked inside FTL expressions (`${…}` / directive tag interiors).
 */
function findHashLiteralCommaIssues(text: string): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  for (const { start, end } of ftlExpressionRegions(text)) {
    let i = start;
    while (i < end) {
      const ch = text[i]!;
      if (isFtlCommentStart(text, i)) {
        i = skipCommentWithin(text, i, end);
        continue;
      }
      if (ch === '"' || ch === "'") {
        i = skipString(text, i, end);
        continue;
      }
      if (
        ch === "{" &&
        !(i > 0 && (text[i - 1] === "$" || text[i - 1] === "#"))
      ) {
        const close = findMatchingBrace(text, i, end);
        if (close !== -1) {
          diags.push(...checkHashLiteralCommas(text, i, close));
        }
        // Advance one so nested `{` inside this hash are also checked.
        i++;
        continue;
      }
      i++;
    }
  }
  return diags;
}

/** Skip the FTL comment at `i`, never past `limit` (unclosed / overrun → `limit`). */
function skipCommentWithin(text: string, i: number, limit: number): number {
  return skipCommentAt(text, i, limit);
}

/** Ranges of FTL expression text: interpolation bodies + directive tag inners. */
function ftlExpressionRegions(
  text: string
): Array<{ start: number; end: number }> {
  const regions: Array<{ start: number; end: number }> = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  while (i < text.length) {
    if (
      !inString &&
      (text.startsWith("<#--", i) || text.startsWith("[#--", i))
    ) {
      i = skipFtlComment(text, i);
      continue;
    }
    if (inString) {
      if (text[i] === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (text[i] === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      inString = text[i] as '"' | "'";
      i++;
      continue;
    }

    if (text.startsWith("${", i) || text.startsWith("#{", i)) {
      const open = i;
      i += 2;
      const close = findMatchingBrace(text, open + 1, text.length);
      if (close === -1) {
        break;
      }
      regions.push({ start: open + 2, end: close });
      i = close + 1;
      continue;
    }

    // Directive / user-tag open: <#…> / [#…] / <@…> / [@…] (not comments)
    if (!text.startsWith("<#--", i) && !text.startsWith("[#--", i)) {
      const head = matchDirectiveHead(text, i);
      if (head && !head.isClose) {
        const closeBracket = head.bracket === "<" ? ">" : "]";
        const innerStart = i + head.length;
        const close = scanDirectiveClose(text, innerStart, closeBracket);
        if (close !== -1) {
          regions.push({ start: innerStart, end: close });
          i = close + 1;
          continue;
        }
      }
    }

    i++;
  }

  return regions;
}

/**
 * Validate commas inside one hash `{…}` spanning [openBrace, closeBrace].
 * Nested hashes are checked by the outer region walk (each `{` separately).
 */
function checkHashLiteralCommas(
  text: string,
  openBrace: number,
  closeBrace: number
): FtlDiagnostic[] {
  const diags: FtlDiagnostic[] = [];
  let i = openBrace + 1;

  const skipWs = (): void => {
    while (i < closeBrace) {
      if (/\s/.test(text[i]!)) {
        i++;
      } else if (isFtlCommentStart(text, i)) {
        i = skipCommentWithin(text, i, closeBrace);
      } else {
        break;
      }
    }
  };

  skipWs();
  if (i >= closeBrace) {
    return diags; // empty `{}`
  }

  while (i < closeBrace) {
    // ---- key until top-level ':' ----
    const keyStart = i;
    if (!scanHashPart(text, keyStart, closeBrace, ":", (pos) => {
      i = pos;
    })) {
      // no ':' before `}` — not a well-formed hash entry; stop quietly
      // (other checkers may cover malformed shapes later)
      return diags;
    }
    const colonAt = i;
    i = colonAt + 1;
    skipWs();

    // ---- value until top-level ',' or next key / end ----
    const valueEnd = scanHashValue(text, i, closeBrace);
    i = valueEnd;
    skipWs();

    if (i >= closeBrace) {
      return diags; // last entry, no trailing comma
    }

    if (text[i] === ",") {
      const commaAt = i;
      i++;
      skipWs();
      if (i >= closeBrace) {
        diags.push({
          offset: commaAt,
          length: 1,
          message:
            "Trailing comma in hash literal; remove the comma after the last entry.",
          severity: "error",
        });
        return diags;
      }
      continue; // next entry
    }

    // Next key/content without comma (scanHashValue stopped at the new key)
    diags.push({
      offset: i,
      length: 1,
      message:
        "Missing comma between hash entries; separate key/value pairs with ','.",
      severity: "error",
    });
    // Resync: continue parsing from here as the next key
  }

  return diags;
}

/** Scan until top-level `stopChar` (nesting-aware). Returns false if hit closeBrace first. */
function scanHashPart(
  text: string,
  from: number,
  closeBrace: number,
  stopChar: string,
  onStop: (pos: number) => void
): boolean {
  let i = from;
  let inString: '"' | "'" | null = null;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  while (i < closeBrace) {
    const c = text[i]!;
    if (inString) {
      if (c === "\\" && i + 1 < closeBrace) {
        i += 2;
        continue;
      }
      if (c === inString) {
        inString = null;
      }
      i++;
      continue;
    }
    if (isFtlCommentStart(text, i)) {
      i = skipCommentWithin(text, i, closeBrace);
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      i++;
      continue;
    }
    if (c === "(") {
      paren++;
    } else if (c === ")" && paren > 0) {
      paren--;
    } else if (c === "[") {
      bracket++;
    } else if (c === "]" && bracket > 0) {
      bracket--;
    } else if (c === "{") {
      brace++;
    } else if (c === "}" && brace > 0) {
      brace--;
    } else if (
      c === stopChar &&
      paren === 0 &&
      bracket === 0 &&
      brace === 0
    ) {
      onStop(i);
      return true;
    }
    i++;
  }
  return false;
}

/**
 * Scan a hash value; stop at top-level `,`, `closeBrace`, or the start of the
 * next key when a comma is missing (caller flags that).
 */
function scanHashValue(
  text: string,
  from: number,
  closeBrace: number
): number {
  let i = from;
  let inString: '"' | "'" | null = null;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let sawValue = false;
  /** Last significant (non-whitespace, non-comment) offset; comments act as whitespace. */
  let lastSig = -1;

  while (i < closeBrace) {
    const c = text[i]!;

    if (inString) {
      if (c === "\\" && i + 1 < closeBrace) {
        i += 2;
        continue;
      }
      if (c === inString) {
        inString = null;
        sawValue = true;
        lastSig = i;
      }
      i++;
      continue;
    }

    if (isFtlCommentStart(text, i)) {
      i = skipCommentWithin(text, i, closeBrace);
      continue;
    }

    // Top-level comma ends the value
    if (c === "," && paren === 0 && bracket === 0 && brace === 0) {
      return i;
    }

    if (c === '"' || c === "'") {
      if (
        sawValue &&
        paren === 0 &&
        bracket === 0 &&
        brace === 0 &&
        looksLikeHashKeyStart(text, i, closeBrace)
      ) {
        return i; // next key without comma
      }
      inString = c;
      sawValue = true;
      lastSig = i;
      i++;
      continue;
    }

    if (
      sawValue &&
      paren === 0 &&
      bracket === 0 &&
      brace === 0 &&
      /[a-zA-Z_]/.test(c) &&
      looksLikeHashKeyStart(text, i, closeBrace)
    ) {
      if (lastSig !== -1 && /[\w"'`)\]}.]/.test(text[lastSig]!)) {
        return i; // next key without comma
      }
    }

    if (c === "(") {
      paren++;
      sawValue = true;
    } else if (c === ")" && paren > 0) {
      paren--;
      sawValue = true;
    } else if (c === "[") {
      bracket++;
      sawValue = true;
    } else if (c === "]" && bracket > 0) {
      bracket--;
      sawValue = true;
    } else if (c === "{") {
      brace++;
      sawValue = true;
    } else if (c === "}" && brace > 0) {
      brace--;
      sawValue = true;
    } else if (!/\s/.test(c)) {
      sawValue = true;
    }

    if (!/\s/.test(c)) {
      lastSig = i;
    }
    i++;
  }

  return closeBrace; // last entry
}

/** True if from `pos` we can parse a key then see top-level `:` before `,` / end. */
function looksLikeHashKeyStart(
  text: string,
  pos: number,
  closeBrace: number
): boolean {
  let i = pos;
  let inString: '"' | "'" | null = null;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let saw = false;
  while (i < closeBrace) {
    const c = text[i]!;
    if (inString) {
      if (c === "\\" && i + 1 < closeBrace) {
        i += 2;
        continue;
      }
      if (c === inString) {
        inString = null;
      }
      i++;
      saw = true;
      continue;
    }
    if (isFtlCommentStart(text, i)) {
      i = skipCommentWithin(text, i, closeBrace);
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      i++;
      saw = true;
      continue;
    }
    if (c === "(") {
      paren++;
    } else if (c === ")" && paren > 0) {
      paren--;
    } else if (c === "[") {
      bracket++;
    } else if (c === "]" && bracket > 0) {
      bracket--;
    } else if (c === "{") {
      brace++;
    } else if (c === "}" && brace > 0) {
      brace--;
    } else if (
      c === ":" &&
      paren === 0 &&
      bracket === 0 &&
      brace === 0
    ) {
      return saw;
    } else if (
      (c === "," || c === "}") &&
      paren === 0 &&
      bracket === 0 &&
      brace === 0
    ) {
      return false;
    } else if (!/\s/.test(c)) {
      saw = true;
    }
    i++;
  }
  return false;
}

/** Map diagnostics to 0-based line/character for editors or tests. */
export function diagnosticPositions(
  text: string,
  d: FtlDiagnostic,
  lineMap = buildLineMap(text)
): { line: number; character: number; endLine: number; endCharacter: number } {
  const start = offsetToPos(lineMap, d.offset);
  const end = offsetToPos(lineMap, d.offset + d.length);
  return {
    line: start.line,
    character: start.character,
    endLine: end.line,
    endCharacter: end.character,
  };
}
