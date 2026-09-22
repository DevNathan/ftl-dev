export type CloseEdit = {
  /**
   * Replace [start, end) with `text` (preferred for `</` → full close tag).
   * When set, insertAt/insertText are ignored.
   */
  replace?: {
    start: number;
    end: number;
    text: string;
  };
  /** Absolute offset where insertText is inserted (self-close `/` → `>` case) */
  insertAt?: number;
  insertText?: string;
  /** Optional new cursor offset after the edit (absolute, in the resulting text) */
  cursorAt?: number;
};

export type OpenSite = {
  /** e.g. `#if` or `@banner` */
  name: string;
  /** Indentation string of the line containing the open tag */
  indent: string;
  /** Absolute offset of the open tag start (`<` / `[`) */
  offset: number;
};

/**
 * After the user typed `/` at `offset` (offset is position after `/`),
 * decide what to auto-insert.
 *
 * 1) Inside open tag: `<#assign /` → insert `>`
 * 2) Close tag start: `</` → replace indent+`</` with opener-aligned `</#name>`
 */
export function autoCloseAfterSlash(
  text: string,
  offset: number
): CloseEdit | undefined {
  if (offset < 1 || text[offset - 1] !== "/") {
    return undefined;
  }

  const before = text.slice(0, offset);

  // Case 2: `</` or `[/`
  const close = before.match(/([<\[])\/$/);
  if (close) {
    const openBracket = close[1]!;
    const closeBracket = openBracket === "<" ? ">" : "]";
    const open = findUnclosedDirectiveOpen(
      before.slice(0, -2),
      openBracket
    );
    if (!open) {
      return undefined;
    }

    const line = lineIndentAt(text, offset - 2);
    const closeStart = offset - 2; // '<' or '[' of `</` / `[/`
    const closeToken = `${openBracket}/${open.name}${closeBracket}`;
    // Only rewrite indent when `</` is the sole content on the line.
    // Same-line `<#if x></` must not eat the open tag.
    const prefix = text.slice(line.lineStart, closeStart);
    const onlyCloseOnLine = prefix.trim() === "";
    if (onlyCloseOnLine) {
      const textOut = `${open.indent}${closeToken}`;
      return {
        replace: {
          start: line.lineStart,
          end: offset,
          text: textOut,
        },
        cursorAt: line.lineStart + textOut.length,
      };
    }
    return {
      replace: {
        start: closeStart,
        end: offset,
        text: closeToken,
      },
      cursorAt: closeStart + closeToken.length,
    };
  }

  // Case 1: self-close slash inside an open directive (not yet closed)
  const open = before.match(/([<\[])([#@])([a-zA-Z_][\w\.]*)\b[^>\]]*$/);
  if (open) {
    if (/\/[>\]]$/.test(before)) {
      return undefined;
    }
    const after = text[offset];
    if (after === ">" || after === "]") {
      return undefined;
    }
    const end = open[1] === "[" ? "]" : ">";
    return {
      insertAt: offset,
      insertText: end,
      cursorAt: offset + 1,
    };
  }

  return undefined;
}

/** Walk for last unclosed `<#name` / `<@name` (same bracket style). */
export function findUnclosedDirectiveName(
  textBefore: string,
  openBracket: string
): string | undefined {
  return findUnclosedDirectiveOpen(textBefore, openBracket)?.name;
}

export function findUnclosedDirectiveOpen(
  textBefore: string,
  openBracket: string
): OpenSite | undefined {
  const closeBracket = openBracket === "<" ? ">" : "]";
  const stack: OpenSite[] = [];

  const re = new RegExp(
    `${escapeRe(openBracket)}(/)?([#@])([a-zA-Z_][\\w\\.]*)\\b([^${escapeRe(closeBracket)}]*)(${escapeRe(closeBracket)})`,
    "g"
  );

  let m: RegExpExecArray | null;
  while ((m = re.exec(textBefore)) !== null) {
    const isClose = m[1] === "/";
    const sigil = m[2]!;
    const name = m[3]!;
    const inner = m[4] ?? "";
    const selfClose = /\/\s*$/.test(inner);
    const key = `${sigil}${name}`;

    if (selfClose) {
      continue;
    }
    if (isClose) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i]!.name === key) {
          stack.splice(i, 1);
          break;
        }
      }
    } else if (isBlockOpenForClose(sigil, name, inner)) {
      const { indent } = lineIndentAt(textBefore, m.index);
      stack.push({ name: key, indent, offset: m.index });
    }
  }

  return stack.length ? stack[stack.length - 1] : undefined;
}

export function lineIndentAt(
  text: string,
  offset: number
): { lineStart: number; contentStart: number; indent: string } {
  let lineStart = Math.max(0, Math.min(offset, text.length));
  while (lineStart > 0 && text[lineStart - 1] !== "\n") {
    lineStart--;
  }
  let contentStart = lineStart;
  while (
    contentStart < text.length &&
    (text[contentStart] === " " || text[contentStart] === "\t")
  ) {
    contentStart++;
  }
  return {
    lineStart,
    contentStart,
    indent: text.slice(lineStart, contentStart),
  };
}

const ALWAYS_BLOCK = new Set([
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
]);

const CAPTURE_ASSIGN = new Set(["assign", "local", "global"]);

function isBlockOpenForClose(
  sigil: string,
  name: string,
  inner: string
): boolean {
  if (sigil === "@") {
    return true;
  }
  if (ALWAYS_BLOCK.has(name)) {
    return true;
  }
  if (!CAPTURE_ASSIGN.has(name)) {
    return true;
  }
  const body = inner.replace(/\/\s*$/, "").trim();
  return !/(=|\+\+|--|\+=|-=|\*=|\/=|%=)/.test(body);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Apply a CloseEdit to a string (for tests). */
export function applyCloseEdit(text: string, edit: CloseEdit): string {
  if (edit.replace) {
    const { start, end, text: t } = edit.replace;
    return text.slice(0, start) + t + text.slice(end);
  }
  if (edit.insertAt !== undefined && edit.insertText !== undefined) {
    return (
      text.slice(0, edit.insertAt) + edit.insertText + text.slice(edit.insertAt)
    );
  }
  return text;
}
