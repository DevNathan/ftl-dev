import { skipFtlComment } from "./comments";

type Span = { start: number; end: number };

/**
 * Collect FTL expression regions: `${…}` interiors and open-tag
 * interiors of `<#…>` / `[#…]` (not comment tags `<#--` / `[#--`).
 */
export function findExpressionSpans(text: string): Span[] {
  const spans: Span[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;

  while (i < text.length) {
    // FTL comments (nested)
    if (!inString && (text.startsWith("<#--", i) || text.startsWith("[#--", i))) {
      i = skipFtlComment(text, i);
      continue;
    }

    // HTML comments
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

    // Interpolation ${ … }
    if (ch === "$" && text[i + 1] === "{") {
      const innerStart = i + 2;
      const close = findMatchingBrace(text, innerStart);
      if (close !== -1) {
        spans.push({ start: innerStart, end: close });
        i = close + 1;
        continue;
      }
      i += 2;
      continue;
    }

    // Open directive <#name …> or [#name …] (not closing </# or [/#)
    if (
      (ch === "<" || ch === "[") &&
      text[i + 1] === "#" &&
      text[i + 2] !== "-"
    ) {
      const closeCh = ch === "<" ? ">" : "]";
      const nameStart = i + 2;
      let j = nameStart;
      while (j < text.length && /[a-zA-Z_]/.test(text[j]!)) {
        j++;
      }
      // Expression starts after directive name (and optional whitespace)
      const exprStart = j;
      const close = findOpenTagClose(text, exprStart, closeCh);
      if (close !== -1 && close > exprStart) {
        spans.push({ start: exprStart, end: close });
        i = close + 1;
        continue;
      }
      i = j;
      continue;
    }

    i++;
  }

  return spans;
}

function findMatchingBrace(text: string, from: number): number {
  let depth = 1;
  let inString: '"' | "'" | null = null;
  let i = from;
  while (i < text.length) {
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
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }
  return -1;
}

/** Find `>` or `]` that closes an open directive tag, respecting strings/parens. */
function findOpenTagClose(
  text: string,
  from: number,
  closeCh: ">" | "]"
): number {
  let inString: '"' | "'" | null = null;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let i = from;
  while (i < text.length) {
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
    if (ch === "(") {
      paren++;
    } else if (ch === ")") {
      paren = Math.max(0, paren - 1);
    } else if (ch === "[") {
      bracket++;
    } else if (ch === "]" && closeCh !== "]") {
      bracket = Math.max(0, bracket - 1);
    } else if (ch === "{") {
      brace++;
    } else if (ch === "}") {
      brace = Math.max(0, brace - 1);
    } else if (
      ch === closeCh &&
      paren === 0 &&
      brace === 0 &&
      (closeCh === ">" || bracket === 0)
    ) {
      // For `]`, only close when not inside nested `[…]` used as hash access —
      // bracket depth already tracked; when closeCh is `]`, treat top-level `]`.
      if (closeCh === "]" && bracket > 0) {
        bracket--;
        i++;
        continue;
      }
      return i;
    }
    i++;
  }
  return -1;
}
