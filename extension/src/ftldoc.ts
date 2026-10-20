/**
 * ftldoc — JavaDoc-like documentation in an FTL comment immediately above a
 * declaration (`<#-- … -->` / `[#-- … --]`).
 *
 * Attachment rules (product):
 * 1. Only whitespace may sit between comment end and the declaration.
 * 2. After trim, leading `@nodoc` (case-insensitive) → no documentation.
 * 3. Tags: summary, `@param`, `@return`/`@returns`, `@deprecated`,
 *    `@see`, `@since`, `@stop` (FreeMarker `#stop`, not Java `@throws`).
 * 4. Applies to `#function` / `#macro` / `#assign` / `#local` / `#global`
 *    (attachment is done by the symbol indexer).
 */

import { findFtlCommentEnd, ftlCommentRanges } from "./comments";

export type FtlDocParam = {
  name: string;
  description: string;
};

export type FtlDoc = {
  summary: string;
  params: FtlDocParam[];
  returns?: string;
  /** Present when `@deprecated` was parsed; may be empty (flag only). */
  deprecated?: string;
  /** `@see` targets (symbol name, URL, or free text), in order. */
  see?: string[];
  /** `@since` version / milestone text. */
  since?: string;
  /**
   * `@stop` notes — documents `#stop` (FreeMarker has no throw).
   * Multiple `@stop` lines allowed.
   */
  stops?: string[];
};

/**
 * Comment body with delimiters removed, or undefined if there is no leading
 * FTL comment whose end equals the whitespace-trimmed position before
 * `declOffset` (non-whitespace between comment and declaration → undefined).
 */
export function extractLeadingCommentBody(
  text: string,
  declOffset: number,
  commentRanges?: Array<[number, number]>
): string | undefined {
  let i = declOffset;
  while (i > 0 && /[ \t\r\n]/.test(text[i - 1]!)) {
    i--;
  }
  if (i === 0) {
    return undefined;
  }
  const ranges = commentRanges ?? ftlCommentRanges(text);
  // Closest range that ends exactly at i (only whitespace between comment and decl).
  for (let r = ranges.length - 1; r >= 0; r--) {
    const [start, end] = ranges[r]!;
    if (end < i) {
      break;
    }
    if (end === i) {
      return stripCommentDelimiters(text, start, end);
    }
  }
  return undefined;
}

function stripCommentDelimiters(
  text: string,
  start: number,
  end: number
): string | undefined {
  const angle = text.startsWith("<#--", start);
  const square = text.startsWith("[#--", start);
  if (!angle && !square) {
    return undefined;
  }
  // Prefer closed end; unclosed → still allow body to EOF for nodoc checks.
  const closed = findFtlCommentEnd(text, start);
  const closeTok = angle ? "-->" : "--]";
  const openTok = angle ? "<#--" : "[#--";
  const bodyEnd =
    closed !== -1 && closed === end ? end - closeTok.length : end;
  return text.slice(start + openTok.length, bodyEnd);
}

/**
 * Parse ftldoc body. Returns `undefined` when `@nodoc` leads the trimmed text,
 * or when the body is empty / whitespace-only with no tags.
 *
 * Mid-body `@nodoc` is not the leading-nodoc rule: that tag line is skipped
 * and does not discard the rest of the documentation.
 *
 * Free-text summary is only collected **before** the first `@` tag line
 * (JavaDoc-style: put lists/prose above tags).
 */
export function parseFtlDoc(body: string): FtlDoc | undefined {
  const trimmed = body.trim();
  if (!trimmed) {
    return undefined;
  }
  // First token after trim is @nodoc (case-insensitive word boundary).
  if (/^@nodoc\b/i.test(trimmed)) {
    return undefined;
  }

  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const summaryParts: string[] = [];
  const params: FtlDocParam[] = [];
  const see: string[] = [];
  const stops: string[] = [];
  let returns: string | undefined;
  let deprecated: string | undefined;
  let since: string | undefined;
  let inTags = false;

  for (const raw of lines) {
    const line = raw.replace(/^\s*\*\s?/, ""); // tolerate optional leading *
    const tag = /^\s*@(\w+)\b(.*)$/.exec(line);
    if (tag) {
      inTags = true;
      const name = tag[1]!.toLowerCase();
      const rest = tag[2]!.trim();
      if (name === "nodoc") {
        // Mid-doc @nodoc is not the "leading nodoc" rule; skip the tag line.
        continue;
      }
      if (name === "param") {
        const m = /^([a-zA-Z_][\w]*)\s*(.*)$/.exec(rest);
        if (m) {
          params.push({ name: m[1]!, description: m[2]!.trim() });
        }
        continue;
      }
      if (name === "return" || name === "returns") {
        returns = rest || returns;
        continue;
      }
      if (name === "deprecated") {
        // Empty message still marks deprecated.
        deprecated = rest;
        continue;
      }
      if (name === "see") {
        if (rest) {
          see.push(rest);
        }
        continue;
      }
      if (name === "since") {
        since = rest || since;
        continue;
      }
      if (name === "stop") {
        // Empty @stop still records a stop note (flag).
        stops.push(rest);
        continue;
      }
      // Unknown @tags: ignore
      continue;
    }
    if (!inTags) {
      summaryParts.push(line);
    }
  }

  const summary = summaryParts.join("\n").trim();
  if (
    !summary &&
    params.length === 0 &&
    returns === undefined &&
    deprecated === undefined &&
    see.length === 0 &&
    since === undefined &&
    stops.length === 0
  ) {
    return undefined;
  }
  return {
    summary,
    params,
    ...(returns !== undefined ? { returns } : {}),
    ...(deprecated !== undefined ? { deprecated } : {}),
    ...(see.length > 0 ? { see } : {}),
    ...(since !== undefined ? { since } : {}),
    ...(stops.length > 0 ? { stops } : {}),
  };
}

/** Leading ftldoc for a declaration at `declOffset`, or undefined. */
export function leadingFtlDoc(
  text: string,
  declOffset: number,
  commentRanges?: Array<[number, number]>
): FtlDoc | undefined {
  const body = extractLeadingCommentBody(text, declOffset, commentRanges);
  if (body === undefined) {
    return undefined;
  }
  return parseFtlDoc(body);
}

/**
 * Stable Markdown for Hover: symbol header, optional Deprecated, summary,
 * Parameters, Returns, Stop, See, Since.
 */
export function formatFtlDocMarkdown(
  name: string,
  kind: string,
  doc: FtlDoc | undefined,
  fromImport?: string
): string {
  const where = fromImport ? ` (from \`${fromImport}\`)` : "";
  const parts: string[] = [`\`${name}\` — ${kind}${where}`];
  if (!doc) {
    return parts.join("\n\n");
  }
  if (doc.deprecated !== undefined) {
    parts.push(
      doc.deprecated.trim()
        ? `**Deprecated**: ${doc.deprecated}`
        : "**Deprecated**"
    );
  }
  if (doc.summary) {
    parts.push(doc.summary);
  }
  if (doc.params.length > 0) {
    const lines = doc.params.map((p) => {
      const desc = p.description ? ` — ${p.description}` : "";
      return `- \`${p.name}\`${desc}`;
    });
    parts.push(`**Parameters**\n\n${lines.join("\n")}`);
  }
  if (doc.returns) {
    parts.push(`**Returns** — ${doc.returns}`);
  }
  if (doc.stops && doc.stops.length > 0) {
    const lines = doc.stops.map((s) =>
      s.trim() ? `- ${s}` : "- (may `#stop`)"
    );
    parts.push(`**Stop**\n\n${lines.join("\n")}`);
  }
  if (doc.see && doc.see.length > 0) {
    const lines = doc.see.map((s) => `- ${s}`);
    parts.push(`**See**\n\n${lines.join("\n")}`);
  }
  if (doc.since) {
    parts.push(`**Since** — ${doc.since}`);
  }
  return parts.join("\n\n");
}
