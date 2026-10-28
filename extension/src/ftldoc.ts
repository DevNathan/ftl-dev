/**
 * ftldoc — JavaDoc-like documentation in an FTL comment immediately above a
 * declaration (`<#-- … -->` / `[#-- … --]`).
 *
 * Attachment rules (product):
 * 1. Only whitespace may sit between comment end and the declaration.
 * 2. After trim, leading `@nodoc` (case-insensitive) → no documentation.
 *    Leading `@lang` (e.g. `<#-- @lang sql -->`, plan 0041) is an embedded-
 *    language marker, not a doc, and is transparent: a doc comment directly
 *    above the marker still attaches to the declaration below it.
 * 3. Block tags (multi-line, Javadoc / JSDoc style): summary, `@param`,
 *    `@return`/`@returns`, `@deprecated`, `@see`, `@since`, `@stop`
 *    (FreeMarker `#stop`, not Java `@throws`); every other tag is kept in
 *    `tags` (rendered by `ftldocMarkdown.ts`).
 * 4. Applies to `#function` / `#macro` / `#assign` / `#local` / `#global`
 *    (attachment is done by the symbol indexer).
 */

import { findFtlCommentEnd, ftlCommentRanges } from "./comments";

export type FtlDocParam = {
  /** Parameter name; may be dotted (`payload.items`) for nested properties. */
  name: string;
  /** Dedented description; may be multi-line (empty when absent). */
  description: string;
  /** JSDoc `{type}` text (display only, never checked). */
  type?: string;
  /** `[name]` / `[name=value]`. */
  optional?: boolean;
  /** Raw default text from `[name=value]`. */
  defaultValue?: string;
  /** Absolute offset of `name` in the source (set when a base offset is known). */
  nameOffset?: number;
};

/** Any block tag without a dedicated field (example, note, author, unknown…). */
export type FtlDocTag = {
  /** Tag name as written, without `@`. */
  tag: string;
  /** Dedented body text; may be multi-line or empty. */
  text: string;
};

export type FtlDoc = {
  summary: string;
  params: FtlDocParam[];
  /** `@return` / `@returns` text without the `{type}`; may be multi-line. */
  returns?: string;
  /** `@return {type}` type text. */
  returnsType?: string;
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
  /** Every other block tag, in source order. */
  tags?: FtlDocTag[];
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
  return extractLeadingComment(text, declOffset, commentRanges)?.body;
}

/**
 * Like {@link extractLeadingCommentBody}, plus `bodyOffset`: the absolute
 * offset of the body's first character in `text`.
 */
export function extractLeadingComment(
  text: string,
  declOffset: number,
  commentRanges?: Array<[number, number]>
): { body: string; bodyOffset: number } | undefined {
  const ranges = commentRanges ?? ftlCommentRanges(text);
  let pos = declOffset;
  // Each pass finds the comment ending right before `pos`; `@lang` marker
  // comments are skipped so the doc above them still attaches (plan 0041).
  for (;;) {
    let i = pos;
    while (i > 0 && /[ \t\r\n]/.test(text[i - 1]!)) {
      i--;
    }
    if (i === 0) {
      return undefined;
    }
    let found: [number, number] | undefined;
    // Closest range that ends exactly at i (only whitespace between comment and decl).
    for (let r = ranges.length - 1; r >= 0; r--) {
      const [start, end] = ranges[r]!;
      if (end < i) {
        break;
      }
      if (end === i) {
        found = [start, end];
        break;
      }
    }
    if (found === undefined) {
      return undefined;
    }
    const c = stripCommentDelimiters(text, found[0], found[1]);
    if (c !== undefined && isLangMarker(c.body)) {
      pos = found[0];
      continue;
    }
    return c;
  }
}

/** `@lang <id>` marker comment (`<#-- @lang sql -->`): not a doc (plan 0041). */
export function isLangMarker(body: string): boolean {
  return /^@lang\b/i.test(body.trim());
}

function stripCommentDelimiters(
  text: string,
  start: number,
  end: number
): { body: string; bodyOffset: number } | undefined {
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
  const bodyOffset = start + openTok.length;
  return { body: text.slice(bodyOffset, bodyEnd), bodyOffset };
}

/** One source line of the comment body; `offset` = absolute offset of `text[0]`. */
type SrcLine = { text: string; offset: number };

/** Tag line: optional indent, `@name` (letter first, then word chars / `-`). */
const TAG_LINE_RE = /^(\s*)@([A-Za-z][\w-]*)(?![\w-])/;
/** Every non-blank line starts with a `*` gutter (`/** … * … *\/` style). */
const GUTTER_RE = /^\s*\*(?=\s|$)/;

function isBlank(s: string): boolean {
  return s.trim() === "";
}

function leadingWs(s: string): number {
  return /^[ \t]*/.exec(s)![0].length;
}

/** Remove the common leading whitespace of non-blank lines; blanks become "". */
function dedentLines(lines: SrcLine[]): SrcLine[] {
  let min = Infinity;
  for (const l of lines) {
    if (!isBlank(l.text)) {
      min = Math.min(min, leadingWs(l.text));
    }
  }
  if (min === Infinity) {
    min = 0;
  }
  return lines.map((l) =>
    isBlank(l.text)
      ? { text: "", offset: l.offset }
      : { text: l.text.slice(min).trimEnd(), offset: l.offset + min }
  );
}

function trimBlankEdges(lines: SrcLine[]): SrcLine[] {
  let a = 0;
  let b = lines.length;
  while (a < b && isBlank(lines[a]!.text)) {
    a++;
  }
  while (b > a && isBlank(lines[b - 1]!.text)) {
    b--;
  }
  return lines.slice(a, b);
}

/**
 * Block body = trimmed head (rest of the first line) + dedented continuation,
 * with leading / trailing blank lines dropped (D1).
 */
function blockBody(head: SrcLine | undefined, continuation: SrcLine[]): SrcLine[] {
  const out: SrcLine[] = [];
  if (head) {
    const lead = leadingWs(head.text);
    const t = head.text.slice(lead).trimEnd();
    out.push({ text: t, offset: head.offset + lead });
  }
  out.push(...dedentLines(continuation));
  return trimBlankEdges(out);
}

/** Joined body text plus a mapper from string index to absolute source offset. */
class BodyText {
  readonly text: string;
  private readonly starts: number[] = [];
  constructor(private readonly lines: SrcLine[]) {
    let pos = 0;
    for (const l of lines) {
      this.starts.push(pos);
      pos += l.text.length + 1;
    }
    this.text = lines.map((l) => l.text).join("\n");
  }
  offsetAt(index: number): number | undefined {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      if (this.starts[i]! <= index) {
        return this.lines[i]!.offset + (index - this.starts[i]!);
      }
    }
    return undefined;
  }
}

/**
 * JSDoc `{type}` at the start of `s`: braces balanced and closed on the same
 * line, inner text non-empty (D2). Returns the type and the index after `}`.
 */
export function readLeadingType(
  s: string
): { type: string; end: number } | undefined {
  if (!s.startsWith("{")) {
    return undefined;
  }
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "\n") {
      return undefined;
    }
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const inner = s.slice(1, i).trim();
        return inner ? { type: inner, end: i + 1 } : undefined;
      }
    }
  }
  return undefined;
}

/** Rest after a name / type: drop same-line spaces, then a lone newline, edges. */
function restText(s: string): string {
  let r = s.replace(/^[ \t]+/, "");
  if (r.startsWith("\n")) {
    r = r.slice(1);
  }
  return r.replace(/^(?:[ \t]*\n)+/, "").replace(/\s+$/, "");
}

function parseParamBody(body: BodyText): FtlDocParam | undefined {
  const s = body.text;
  let i = 0;
  let type: string | undefined;
  const t = readLeadingType(s);
  if (t) {
    type = t.type;
    i = t.end;
  }
  while (i < s.length && /\s/.test(s[i]!)) {
    i++;
  }
  let name: string;
  let nameIndex: number;
  let optional = false;
  let defaultValue: string | undefined;
  if (s[i] === "[") {
    // [name] / [name=value] — `]` inside quotes does not close.
    let j = i + 1;
    let q: string | null = null;
    for (; j < s.length; j++) {
      const ch = s[j]!;
      if (q) {
        if (ch === "\\") {
          j++;
        } else if (ch === q) {
          q = null;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        q = ch;
      } else if (ch === "]") {
        break;
      }
    }
    if (j >= s.length) {
      return undefined;
    }
    const inner = s.slice(i + 1, j);
    const eq = inner.indexOf("=");
    const rawName = eq === -1 ? inner : inner.slice(0, eq);
    const m = /^\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*$/.exec(rawName);
    if (!m) {
      return undefined;
    }
    name = m[1]!;
    nameIndex = i + 1 + rawName.indexOf(name);
    optional = true;
    if (eq !== -1) {
      const v = inner.slice(eq + 1).trim();
      if (v) {
        defaultValue = v;
      }
    }
    i = j + 1;
  } else {
    const m = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*/.exec(s.slice(i));
    if (!m) {
      return undefined;
    }
    name = m[0];
    nameIndex = i;
    i += name.length;
  }
  const nameOffset = body.offsetAt(nameIndex);
  return {
    name,
    description: restText(s.slice(i)),
    ...(type !== undefined ? { type } : {}),
    ...(optional ? { optional: true } : {}),
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    ...(nameOffset !== undefined ? { nameOffset } : {}),
  };
}

/**
 * Parse ftldoc body. Returns `undefined` when `@nodoc` leads the trimmed text,
 * or when the body is empty / whitespace-only with no tags.
 *
 * Block model (Javadoc / JSDoc style, plan 0038 D1): a tag line starts (after
 * optional indent / `*` gutter) with `@name`; its body runs until the next tag
 * line, blank lines included, and is dedented by its common indentation. Text
 * before the first tag line is the summary. Mid-line `@word` is prose.
 *
 * Mid-body `@nodoc` is not the leading-nodoc rule: that tag (and its
 * continuation) is skipped and does not discard the rest of the documentation.
 *
 * `baseOffset` is the absolute offset of `body[0]`; it makes
 * `FtlDocParam.nameOffset` absolute.
 */
export function parseFtlDoc(body: string, baseOffset = 0): FtlDoc | undefined {
  const trimmed = body.trim();
  if (!trimmed) {
    return undefined;
  }
  // First token after trim is @nodoc (case-insensitive word boundary).
  if (/^@nodoc\b/i.test(trimmed)) {
    return undefined;
  }
  // `@lang sql` embedded-language marker (plan 0041) is not documentation.
  if (isLangMarker(trimmed)) {
    return undefined;
  }

  // Split lines (LF / CRLF) keeping absolute offsets.
  let lines: SrcLine[] = [];
  {
    let pos = 0;
    for (const raw of body.split("\n")) {
      const t = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
      lines.push({ text: t, offset: baseOffset + pos });
      pos += raw.length + 1;
    }
  }
  // `*` gutter only when every non-blank line has one (keeps `* bullets`).
  const nonBlank = lines.filter((l) => !isBlank(l.text));
  if (nonBlank.length > 0 && nonBlank.every((l) => GUTTER_RE.test(l.text))) {
    lines = lines.map((l) => {
      const m = /^\s*\*[ \t]?/.exec(l.text);
      return m
        ? { text: l.text.slice(m[0].length), offset: l.offset + m[0].length }
        : l;
    });
  }

  type Block = { tag: string; head: SrcLine; cont: SrcLine[] };
  const summaryLines: SrcLine[] = [];
  const blocks: Block[] = [];
  for (const l of lines) {
    const m = TAG_LINE_RE.exec(l.text);
    if (m) {
      const cut = m[0].length;
      blocks.push({
        tag: m[2]!,
        head: { text: l.text.slice(cut), offset: l.offset + cut },
        cont: [],
      });
      continue;
    }
    if (blocks.length > 0) {
      blocks[blocks.length - 1]!.cont.push(l);
    } else {
      summaryLines.push(l);
    }
  }

  // Summary: text on the opener line is a "head" (its leading space is only a
  // separator), the rest is dedented as a block.
  let summaryBody: SrcLine[];
  if (summaryLines.length > 0 && !isBlank(summaryLines[0]!.text)) {
    summaryBody = blockBody(summaryLines[0], summaryLines.slice(1));
  } else {
    summaryBody = blockBody(undefined, summaryLines);
  }
  const summary = summaryBody.map((l) => l.text).join("\n");

  const params: FtlDocParam[] = [];
  const see: string[] = [];
  const stops: string[] = [];
  const tags: FtlDocTag[] = [];
  let returns: string | undefined;
  let returnsType: string | undefined;
  let deprecated: string | undefined;
  let since: string | undefined;

  for (const b of blocks) {
    const name = b.tag.toLowerCase();
    if (name === "nodoc") {
      // Mid-doc @nodoc is not the "leading nodoc" rule; skip the block.
      continue;
    }
    const bodyText = new BodyText(blockBody(b.head, b.cont));
    const text = bodyText.text;
    switch (name) {
      case "param": {
        const p = parseParamBody(bodyText);
        if (p) {
          params.push(p);
        }
        break;
      }
      case "return":
      case "returns": {
        const t = readLeadingType(text);
        const rest = t ? restText(text.slice(t.end)) : text;
        if (t) {
          returnsType = t.type;
        }
        if (rest) {
          returns = rest;
        }
        break;
      }
      case "deprecated":
        // Empty message still marks deprecated.
        deprecated = text;
        break;
      case "see":
        if (text) {
          see.push(text);
        }
        break;
      case "since":
        since = text || since;
        break;
      case "stop":
        // Empty @stop still records a stop note (flag).
        stops.push(text);
        break;
      default:
        tags.push({ tag: b.tag, text });
    }
  }

  if (
    !summary &&
    params.length === 0 &&
    returns === undefined &&
    returnsType === undefined &&
    deprecated === undefined &&
    see.length === 0 &&
    since === undefined &&
    stops.length === 0 &&
    tags.length === 0
  ) {
    return undefined;
  }
  return {
    summary,
    params,
    ...(returns !== undefined ? { returns } : {}),
    ...(returnsType !== undefined ? { returnsType } : {}),
    ...(deprecated !== undefined ? { deprecated } : {}),
    ...(see.length > 0 ? { see } : {}),
    ...(since !== undefined ? { since } : {}),
    ...(stops.length > 0 ? { stops } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  };
}

/** Leading ftldoc for a declaration at `declOffset`, or undefined. */
export function leadingFtlDoc(
  text: string,
  declOffset: number,
  commentRanges?: Array<[number, number]>
): FtlDoc | undefined {
  const c = extractLeadingComment(text, declOffset, commentRanges);
  if (c === undefined) {
    return undefined;
  }
  return parseFtlDoc(c.body, c.bodyOffset);
}

export {
  formatFtlDocMarkdown,
  formatParamDocMarkdown,
  formatSignatureDocMarkdown,
} from "./ftldocMarkdown";
