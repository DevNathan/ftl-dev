/**
 * ftldoc → Markdown (pure). The single renderer for Hover, Signature Help and
 * completion documentation, in VS Code and the LSP server (plan 0038 D9).
 *
 * Rendering rules (plan 0038):
 * - D3: author line breaks are kept as Markdown hard breaks; a list item that
 *   directly follows a paragraph line gets a blank line before it.
 * - D4: leftover ≥ 4-space indentation after a blank line (outside lists) is
 *   emitted as a fenced block instead of an implicit indented code block;
 *   authors' own ``` fences pass through verbatim.
 * - D2: a multi-line tag body starting with `{` is a "shape" block → fenced.
 * - D5: section order and headings; D6: inline `{@link}` / `{@code}` / … tags.
 */

import type { FtlDoc, FtlDocParam, FtlDocTag } from "./ftldoc";

const LIST_ITEM_RE = /^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]+|$)/;
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/;

function isBlank(s: string): boolean {
  return s.trim() === "";
}

function leadingWs(s: string): number {
  return /^[ \t]*/.exec(s)![0].length;
}

function isListItem(s: string): boolean {
  return LIST_ITEM_RE.test(s);
}

/** Inline code span; fence lengthened when `s` contains backticks. */
export function codeSpan(s: string): string {
  let longest = 0;
  for (const m of s.match(/`+/g) ?? []) {
    longest = Math.max(longest, m.length);
  }
  const fence = "`".repeat(longest + 1);
  const pad = longest > 0 || s.startsWith("`") || s.endsWith("`") ? " " : "";
  return `${fence}${pad}${s}${pad}${fence}`;
}

/** Fenced code block; fence longer than any backtick run inside. */
function fenceBlock(lines: readonly string[], lang = ""): string {
  let longest = 0;
  for (const l of lines) {
    for (const m of l.match(/`+/g) ?? []) {
      longest = Math.max(longest, m.length);
    }
  }
  const fence = "`".repeat(Math.max(3, longest + 1));
  return [`${fence}${lang}`, ...lines, fence].join("\n");
}

function dedent(lines: readonly string[]): string[] {
  let min = Infinity;
  for (const l of lines) {
    if (!isBlank(l)) {
      min = Math.min(min, leadingWs(l));
    }
  }
  if (min === Infinity) {
    min = 0;
  }
  return lines.map((l) => (isBlank(l) ? "" : l.slice(min)));
}

/** Escape every ASCII punctuation char (CommonMark backslash escapes). */
function escapeMarkdown(s: string): string {
  return s.replace(/[!-/:-@[-`{-~]/g, "\\$&");
}

function isUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s);
}

/** `{@tag content}` → Markdown (D6), or undefined to leave it literal. */
function renderInlineTag(tag: string, content: string): string | undefined {
  const name = tag.toLowerCase();
  if (name === "code") {
    return codeSpan(content);
  }
  if (name === "literal") {
    return escapeMarkdown(content);
  }
  if (name !== "link" && name !== "linkplain" && name !== "linkcode") {
    return undefined;
  }
  const c = content.trim();
  if (!c) {
    return undefined;
  }
  let target = c;
  let label: string | undefined;
  const bar = c.indexOf("|");
  const ws = c.search(/\s/);
  if (bar !== -1 && (ws === -1 || bar < ws)) {
    target = c.slice(0, bar).trim();
    label = c.slice(bar + 1).trim() || undefined;
  } else if (ws !== -1) {
    target = c.slice(0, ws);
    label = c.slice(ws).trim() || undefined;
  }
  const shown =
    name === "linkcode"
      ? codeSpan(label ?? target)
      : label !== undefined
        ? label
        : name === "linkplain"
          ? target
          : codeSpan(target);
  if (isUrl(target)) {
    return `[${shown}](${target})`;
  }
  return shown;
}

/** Inline tags outside code spans on one line (D6). */
function renderInline(line: string): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i]!;
    if (ch === "`") {
      const run = /^`+/.exec(line.slice(i))![0];
      const close = findClosingRun(line, i + run.length, run.length);
      if (close !== -1) {
        out += line.slice(i, close + run.length);
        i = close + run.length;
        continue;
      }
      out += run;
      i += run.length;
      continue;
    }
    if (ch === "{" && line[i + 1] === "@") {
      const end = matchBrace(line, i);
      const m = /^\{@([A-Za-z]\w*)/.exec(line.slice(i));
      if (end !== -1 && m) {
        const content = line.slice(i + m[0].length, end).replace(/^\s+/, "");
        const r = renderInlineTag(m[1]!, content);
        if (r !== undefined) {
          out += r;
          i = end + 1;
          continue;
        }
      }
    }
    out += ch;
    i++;
  }
  return out;
}

function findClosingRun(line: string, from: number, len: number): number {
  let i = from;
  while (i < line.length) {
    if (line[i] === "`") {
      const run = /^`+/.exec(line.slice(i))![0];
      if (run.length === len) {
        return i;
      }
      i += run.length;
      continue;
    }
    i++;
  }
  return -1;
}

function matchBrace(line: string, open: number): number {
  let depth = 0;
  for (let i = open; i < line.length; i++) {
    if (line[i] === "{") {
      depth++;
    } else if (line[i] === "}") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

type Item =
  | { kind: "raw"; lines: string[] }
  | { kind: "blank" }
  | { kind: "text"; line: string; isList: boolean; inList: boolean };

/** True when `text` is a shape block (D2): multi-line, starts with `{`. */
export function isShapeBlock(text: string): boolean {
  return text.trimStart().startsWith("{") && text.includes("\n");
}

/**
 * Render one doc text (summary or tag body) to Markdown: fences pass through,
 * inline tags (D6), indentation guard (D4), lists and hard breaks (D3).
 * `shape: true` renders a multi-line body starting with `{` verbatim in a
 * fenced block (D2).
 */
export function renderDocText(
  text: string,
  opts: { shape?: boolean } = {}
): string {
  if (!text) {
    return "";
  }
  const lines = text.split("\n");
  if (opts.shape && isShapeBlock(text)) {
    return fenceBlock(dedent(lines));
  }

  const items: Item[] = [];
  let inList = false;
  let prevBlank = true;
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    const fm = FENCE_OPEN_RE.exec(l);
    if (fm) {
      const fence = fm[1]!;
      const closeRe = new RegExp(`^ {0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}\\s*$`);
      let j = i + 1;
      while (j < lines.length && !closeRe.test(lines[j]!)) {
        j++;
      }
      const end = Math.min(j, lines.length - 1);
      items.push({ kind: "raw", lines: lines.slice(i, end + 1) });
      i = end + 1;
      prevBlank = false;
      continue;
    }
    if (isBlank(l)) {
      items.push({ kind: "blank" });
      prevBlank = true;
      i++;
      continue;
    }
    if (isListItem(l)) {
      inList = true;
      items.push({ kind: "text", line: l, isList: true, inList: true });
      prevBlank = false;
      i++;
      continue;
    }
    const indent = leadingWs(l);
    if (prevBlank && indent >= 4 && !inList) {
      // D4: would be an implicit indented code block → explicit fence.
      let j = i;
      let end = i;
      while (j < lines.length) {
        const lj = lines[j]!;
        if (isBlank(lj)) {
          j++;
          continue;
        }
        if (leadingWs(lj) >= 4 && !FENCE_OPEN_RE.test(lj)) {
          end = j;
          j++;
          continue;
        }
        break;
      }
      items.push({ kind: "raw", lines: [fenceBlock(dedent(lines.slice(i, end + 1)))] });
      i = end + 1;
      prevBlank = false;
      continue;
    }
    if (prevBlank && indent === 0) {
      inList = false;
    }
    items.push({ kind: "text", line: l, isList: false, inList });
    prevBlank = false;
    i++;
  }

  const out: string[] = [];
  for (let k = 0; k < items.length; k++) {
    const it = items[k]!;
    if (it.kind === "raw") {
      out.push(...it.lines);
      continue;
    }
    if (it.kind === "blank") {
      out.push("");
      continue;
    }
    const prev = items[k - 1];
    if (
      it.isList &&
      prev?.kind === "text" &&
      !prev.isList &&
      !prev.inList
    ) {
      out.push("");
    }
    const next = items[k + 1];
    const hard = next?.kind === "text" && !next.isList;
    out.push(renderInline(it.line) + (hard ? "  " : ""));
  }
  // Collapse blank runs (e.g. a blank before a raw block plus an inserted one).
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
}

/** Indent every non-empty line after the first by `n` spaces. */
function indentRest(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l, i) => (i === 0 || l === "" ? l : pad + l))
    .join("\n");
}

function indentAll(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l === "" ? l : pad + l))
    .join("\n");
}

/** Rendered text that must start on its own line (fence / list). */
function startsWithBlock(rendered: string): boolean {
  const first = rendered.split("\n")[0] ?? "";
  return FENCE_OPEN_RE.test(first) || isListItem(first);
}

/**
 * `- lead — text` list item; multi-line text continues indented under the
 * item, block-level starts (fence / list) go on the following lines.
 */
function listItem(lead: string, text: string, opts: { shape?: boolean } = {}): string {
  const rendered = renderDocText(text, opts);
  if (!rendered) {
    return `- ${lead}`;
  }
  if (!lead) {
    if (startsWithBlock(rendered)) {
      return `-\n${indentAll(rendered, 2)}`;
    }
    return `- ${indentRest(rendered, 2)}`;
  }
  if (startsWithBlock(rendered)) {
    const sep = FENCE_OPEN_RE.test(rendered.split("\n")[0]!) ? "\n" : "\n\n";
    return `- ${lead}${sep}${indentAll(rendered, 2)}`;
  }
  return `- ${lead} — ${indentRest(rendered, 2)}`;
}

/** `heading — text` for one-line prose, else `heading` + blank + block. */
function section(heading: string, text: string, sep = " — ", shape = false): string {
  const rendered = renderDocText(text, { shape });
  if (!rendered) {
    return heading;
  }
  if (!text.includes("\n") && !startsWithBlock(rendered)) {
    return `${heading}${sep}${rendered}`;
  }
  return `${heading}\n\n${rendered}`;
}

/** `` `{type}` `` + `(optional, default: `v`)` decorations of a parameter. */
function paramDecorations(p: FtlDocParam): string[] {
  const out: string[] = [];
  if (p.type) {
    out.push(codeSpan(`{${p.type}}`));
  }
  if (p.optional) {
    out.push(
      p.defaultValue !== undefined
        ? `(optional, default: ${codeSpan(p.defaultValue)})`
        : "(optional)"
    );
  }
  return out;
}

function paramItem(p: FtlDocParam): string {
  const lead = [codeSpan(p.name), ...paramDecorations(p)].join(" ");
  return listItem(lead, p.description, { shape: true });
}

/** Root name of a (possibly dotted) `@param` name. */
export function ftlDocParamRoot(name: string): string {
  const dot = name.indexOf(".");
  return dot === -1 ? name : name.slice(0, dot);
}

/** Parameters section body: dotted names nested under their root (G12). */
function paramsList(params: readonly FtlDocParam[]): string {
  const roots: string[] = [];
  const own = new Map<string, FtlDocParam[]>();
  const nested = new Map<string, FtlDocParam[]>();
  for (const p of params) {
    const root = ftlDocParamRoot(p.name);
    if (!roots.includes(root)) {
      roots.push(root);
    }
    const bucket = root === p.name ? own : nested;
    bucket.set(root, [...(bucket.get(root) ?? []), p]);
  }
  const out: string[] = [];
  for (const root of roots) {
    const mine = own.get(root) ?? [];
    if (mine.length === 0) {
      out.push(`- ${codeSpan(root)}`);
    }
    for (const p of mine) {
      out.push(paramItem(p));
    }
    for (const child of nested.get(root) ?? []) {
      out.push(indentAll(paramItem(child), 2));
    }
  }
  return out.join("\n");
}

const TAG_HEADINGS: Record<string, string> = {
  example: "**Example**",
  note: "**Note**",
  remarks: "**Remarks**",
  todo: "**TODO**",
  author: "**Author**",
  version: "**Version**",
};

const METADATA_TAGS = new Set(["author", "version"]);

function tagHeading(t: FtlDocTag): string {
  return TAG_HEADINGS[t.tag.toLowerCase()] ?? `**@${t.tag}**`;
}

function renderTag(t: FtlDocTag): string {
  const heading = tagHeading(t);
  const name = t.tag.toLowerCase();
  if (!t.text) {
    return heading;
  }
  if (name === "example") {
    // Verbatim FTL; no inline-tag processing, no hard breaks.
    return `${heading}\n\n${fenceBlock(t.text.split("\n"), "ftl")}`;
  }
  if (METADATA_TAGS.has(name)) {
    return section(heading, t.text);
  }
  return `${heading}\n\n${renderDocText(t.text, { shape: true })}`;
}

function deprecatedSection(doc: FtlDoc): string | undefined {
  if (doc.deprecated === undefined) {
    return undefined;
  }
  return section("**Deprecated**", doc.deprecated, ": ");
}

function returnsSection(doc: FtlDoc): string | undefined {
  if (!doc.returns && !doc.returnsType) {
    return undefined;
  }
  const heading =
    "**Returns**" +
    (doc.returnsType ? ` ${codeSpan(`{${doc.returnsType}}`)}` : "");
  return section(heading, doc.returns ?? "", " — ", true);
}

/**
 * Stable Markdown for Hover / completion: symbol header, Deprecated, summary,
 * Parameters, Returns, Stop, other block tags (source order), See, Since,
 * Author, Version (plan 0038 D5).
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
  const dep = deprecatedSection(doc);
  if (dep) {
    parts.push(dep);
  }
  if (doc.summary) {
    parts.push(renderDocText(doc.summary));
  }
  if (doc.params.length > 0) {
    parts.push(`**Parameters**\n\n${paramsList(doc.params)}`);
  }
  const ret = returnsSection(doc);
  if (ret) {
    parts.push(ret);
  }
  if (doc.stops && doc.stops.length > 0) {
    const lines = doc.stops.map((s) =>
      s.trim() ? listItem("", s) : "- (may `#stop`)"
    );
    parts.push(`**Stop**\n\n${lines.join("\n")}`);
  }
  const tags = doc.tags ?? [];
  for (const t of tags) {
    if (!METADATA_TAGS.has(t.tag.toLowerCase())) {
      parts.push(renderTag(t));
    }
  }
  if (doc.see && doc.see.length > 0) {
    const lines = doc.see.map((s) => listItem("", s));
    parts.push(`**See**\n\n${lines.join("\n")}`);
  }
  if (doc.since) {
    parts.push(section("**Since**", doc.since));
  }
  for (const t of tags) {
    if (METADATA_TAGS.has(t.tag.toLowerCase())) {
      parts.push(renderTag(t));
    }
  }
  return parts.join("\n\n");
}

/**
 * Signature Help documentation (D8): Deprecated + summary + Returns, or
 * undefined when the doc has none of them.
 */
export function formatSignatureDocMarkdown(doc: FtlDoc): string | undefined {
  const parts: string[] = [];
  const dep = deprecatedSection(doc);
  if (dep) {
    parts.push(dep);
  }
  if (doc.summary) {
    parts.push(renderDocText(doc.summary));
  }
  const ret = returnsSection(doc);
  if (ret) {
    parts.push(ret);
  }
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

/**
 * Signature Help parameter documentation (D8): `{type}`, optional / default,
 * description, then nested `name.key` entries as a sub-list. Undefined when
 * there is nothing to show.
 */
export function formatParamDocMarkdown(
  param: FtlDocParam | undefined,
  nested: readonly FtlDocParam[] = []
): string | undefined {
  const parts: string[] = [];
  if (param) {
    const deco = paramDecorations(param).join(" ");
    const desc = renderDocText(param.description, { shape: true });
    if (deco && desc) {
      parts.push(startsWithBlock(desc) ? `${deco}\n\n${desc}` : `${deco} — ${desc}`);
    } else if (deco || desc) {
      parts.push(deco || desc);
    }
  }
  if (nested.length > 0) {
    parts.push(nested.map((p) => paramItem(p)).join("\n"));
  }
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
