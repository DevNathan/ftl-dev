import { skipFtlComment } from "./comments";

/**
 * Find `ident=` (not `==`) at nesting depth 0 in a directive tag inner,
 * skipping strings and FTL comments. Shared by diagnostics and Hover.
 */
export function scanNamedParamLhs(
  inner: string
): Array<{ name: string; relOffset: number }> {
  const hits: Array<{ name: string; relOffset: number }> = [];
  let i = 0;
  let inString: '"' | "'" | null = null;
  let paren = 0;
  let brace = 0;
  let bracket = 0;

  while (i < inner.length) {
    if (
      !inString &&
      (inner.startsWith("<#--", i) || inner.startsWith("[#--", i))
    ) {
      i = skipFtlComment(inner, i);
      continue;
    }

    const ch = inner[i]!;

    if (inString) {
      if (ch === "\\" && i + 1 < inner.length) {
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
      i++;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren--;
      i++;
      continue;
    }
    if (ch === "{") {
      brace++;
      i++;
      continue;
    }
    if (ch === "}" && brace > 0) {
      brace--;
      i++;
      continue;
    }
    if (ch === "[") {
      bracket++;
      i++;
      continue;
    }
    if (ch === "]" && bracket > 0) {
      bracket--;
      i++;
      continue;
    }

    const depth = paren + brace + bracket;
    if (depth === 0 && /[A-Za-z_]/.test(ch)) {
      const start = i;
      i++;
      while (i < inner.length && /[\w]/.test(inner[i]!)) {
        i++;
      }
      const name = inner.slice(start, i);
      let j = i;
      while (j < inner.length && /\s/.test(inner[j]!)) {
        j++;
      }
      if (
        j < inner.length &&
        inner[j] === "=" &&
        !(j + 1 < inner.length && inner[j + 1] === "=")
      ) {
        hits.push({ name, relOffset: start });
        i = j + 1; // past `=`; do not scan value as LHS
        continue;
      }
      continue;
    }

    i++;
  }

  return hits;
}
