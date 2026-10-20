import {
  directiveParamValueCatalog,
  hasDirectiveParamCatalog,
} from "../directiveParams";


export type CompletionContext =
  | { type: "directive"; prefix: string; trigger: "<#" | "[#" }
  | { type: "builtin"; prefix: string }
  | { type: "special"; prefix: string; inRecover: boolean }
  | { type: "ns"; ns: string; prefix: string }
  | {
      type: "directiveParam";
      directive: string;
      prefix: string;
      kind: "named" | "clause" | "value";
      /** Set when `kind === "value"` (catalogued param before `=`). */
      paramName?: string;
    }
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

  const param = detectDirectiveParam(before);
  if (param) {
    return param;
  }

  const general = before.match(/([a-zA-Z_][\w]*)$/);
  return { type: "general", prefix: general?.[1] ?? "" };
}

/**
 * Inside an open `#name …` / `[#name …` start tag (before `>` / `]`),
 * not in a string. After `=` for params with a static value catalog
 * (`kind: "value"`); other value slots fall through to `general`.
 */
function detectDirectiveParam(
  before: string
): Extract<CompletionContext, { type: "directiveParam" }> | null {
  const open = findNearestOpenDirective(before);
  if (!open || !hasDirectiveParamCatalog(open.name)) {
    return null;
  }

  if (isInsideString(before, open.bodyStart, before.length)) {
    return null;
  }

  const prefixMatch = before.match(/([a-zA-Z_][\w]*)$/);
  const prefix = prefixMatch?.[1] ?? "";
  const beforePrefix = before.slice(0, before.length - prefix.length);
  const lastNonSpace = beforePrefix.replace(/\s+$/, "");
  // Value slot after a single `=` (not `==`).
  if (lastNonSpace.endsWith("=")) {
    if (
      lastNonSpace.length >= 2 &&
      lastNonSpace[lastNonSpace.length - 2] === "="
    ) {
      return null;
    }
    const beforeEq = lastNonSpace.slice(0, -1).replace(/\s+$/, "");
    const nameMatch = beforeEq.match(/([a-zA-Z_][\w]*)$/);
    if (!nameMatch) {
      return null;
    }
    const paramName = nameMatch[1]!;
    if (!directiveParamValueCatalog(open.name, paramName)) {
      return null;
    }
    return {
      type: "directiveParam",
      directive: open.name,
      prefix,
      kind: "value",
      paramName,
    };
  }

  const kind: "named" | "clause" =
    open.name === "ftl" || open.name === "setting" || open.name === "include"
      ? "named"
      : "clause";

  return {
    type: "directiveParam",
    directive: open.name,
    prefix,
    kind,
  };
}

/**
 * Nearest unclosed `<#name` / `[#name` before cursor (not `</#` / `[/#`).
 * Closer `>` / `]` is skipped inside quotes.
 */
function findNearestOpenDirective(
  before: string
): { name: string; bodyStart: number } | null {
  const re = /([<\[])#([a-zA-Z_][\w]*)\b/g;
  let last: { name: string; bodyStart: number; closer: string } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) {
    const opener = m[1]!;
    const name = m[2]!;
    const bodyStart = m.index + m[0].length;
    const closer = opener === "<" ? ">" : "]";
    if (!tagClosedBefore(before, bodyStart, closer)) {
      last = { name, bodyStart, closer };
    }
  }
  return last ? { name: last.name, bodyStart: last.bodyStart } : null;
}

/** True if `closer` appears at top level (outside quotes) from `from` to end. */
function tagClosedBefore(
  text: string,
  from: number,
  closer: string
): boolean {
  let inDouble = false;
  let inSingle = false;
  for (let i = from; i < text.length; i++) {
    const c = text[i]!;
    if (inDouble) {
      if (c === "\\" && i + 1 < text.length) {
        i++;
        continue;
      }
      if (c === '"') {
        inDouble = false;
      }
      continue;
    }
    if (inSingle) {
      if (c === "\\" && i + 1 < text.length) {
        i++;
        continue;
      }
      if (c === "'") {
        inSingle = false;
      }
      continue;
    }
    if (c === '"') {
      inDouble = true;
      continue;
    }
    if (c === "'") {
      inSingle = true;
      continue;
    }
    if (c === closer) {
      return true;
    }
  }
  return false;
}

function isInsideString(text: string, from: number, to: number): boolean {
  let inDouble = false;
  let inSingle = false;
  for (let i = from; i < to; i++) {
    const c = text[i]!;
    if (inDouble) {
      if (c === "\\" && i + 1 < to) {
        i++;
        continue;
      }
      if (c === '"') {
        inDouble = false;
      }
      continue;
    }
    if (inSingle) {
      if (c === "\\" && i + 1 < to) {
        i++;
        continue;
      }
      if (c === "'") {
        inSingle = false;
      }
      continue;
    }
    if (c === '"') {
      inDouble = true;
      continue;
    }
    if (c === "'") {
      inSingle = true;
      continue;
    }
  }
  return inDouble || inSingle;
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
