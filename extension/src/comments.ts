/**
 * FreeMarker comments for editor scanners.
 *
 * Nesting (`<#-- … <#-- … --> … -->`) is supported so wrapping a region that
 * already contains comments still forms one closed block.
 *
 * Highlighting mute for comments must come from TextMate `comment.block` scope
 * (not a parallel semantic-token path) so brackets / operators are muted too.
 */

export type CommentDelimiterIssue = {
  offset: number;
  /** true → `<#--` / `-->`; false → `[#--` / `--]` */
  angle: boolean;
  kind: "unclosed-open" | "orphan-close";
};

/** Exclusive end offset after a closed comment at `start`, or -1 if unclosed. */
export function findFtlCommentEnd(text: string, start: number): number {
  const angle = text.startsWith("<#--", start);
  const square = text.startsWith("[#--", start);
  if (!angle && !square) {
    return -1;
  }
  const openTok = angle ? "<#--" : "[#--";
  const closeTok = angle ? "-->" : "--]";
  let depth = 1;
  let i = start + openTok.length;
  while (i < text.length) {
    if (text.startsWith(openTok, i)) {
      depth++;
      i += openTok.length;
      continue;
    }
    if (text.startsWith(closeTok, i)) {
      depth--;
      i += closeTok.length;
      if (depth === 0) {
        return i;
      }
      continue;
    }
    i++;
  }
  return -1;
}

/**
 * Skip a comment starting at `start`.
 * Unclosed openers run to EOF (matches TextMate begin/end comment scope).
 */
export function skipFtlComment(text: string, start: number): number {
  const end = findFtlCommentEnd(text, start);
  return end === -1 ? text.length : end;
}

/**
 * Half-open [start, end) ranges for top-level FTL comments.
 * Nested inners are covered by the outer range. Unclosed open → [start, EOF).
 */
export function ftlCommentRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("<#--", i) || text.startsWith("[#--", i)) {
      const start = i;
      const end = findFtlCommentEnd(text, i);
      if (end === -1) {
        ranges.push([start, text.length]);
        break;
      }
      ranges.push([start, end]);
      i = end;
      continue;
    }
    i++;
  }
  return ranges;
}

/** Offsets of `<#--` / `[#--` that never close (kept for callers/tests). */
export function findUnclosedCommentOpens(text: string): number[] {
  return findCommentDelimiterIssues(text)
    .filter((x) => x.kind === "unclosed-open")
    .map((x) => x.offset);
}

/**
 * Scan for unclosed openers and orphan closers (`-->` / `--]` with no match).
 * Skips HTML `<!-- … -->` and simple quoted strings so HTML comments
 * are not reported as orphan FTL closers.
 */
export function findCommentDelimiterIssues(
  text: string
): CommentDelimiterIssue[] {
  const issues: CommentDelimiterIssue[] = [];
  const angleStack: number[] = [];
  const squareStack: number[] = [];
  let i = 0;
  let inString: '"' | "'" | null = null;

  while (i < text.length) {
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

    // HTML comment — skip (closer is also -->)
    if (text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i + 4);
      i = end === -1 ? text.length : end + 3;
      continue;
    }

    if (text.startsWith("<#--", i)) {
      angleStack.push(i);
      i += 4;
      continue;
    }
    if (text.startsWith("[#--", i)) {
      squareStack.push(i);
      i += 4;
      continue;
    }
    if (text.startsWith("-->", i)) {
      if (angleStack.length > 0) {
        angleStack.pop();
      } else {
        issues.push({ offset: i, angle: true, kind: "orphan-close" });
      }
      i += 3;
      continue;
    }
    if (text.startsWith("--]", i)) {
      if (squareStack.length > 0) {
        squareStack.pop();
      } else {
        issues.push({ offset: i, angle: false, kind: "orphan-close" });
      }
      i += 3;
      continue;
    }
    i++;
  }

  for (const offset of angleStack) {
    issues.push({ offset, angle: true, kind: "unclosed-open" });
  }
  for (const offset of squareStack) {
    issues.push({ offset, angle: false, kind: "unclosed-open" });
  }
  return issues;
}
