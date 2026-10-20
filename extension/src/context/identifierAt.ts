/** Word / dotted name under offset (e.g. ns.greet or greet). */
export function identifierAt(
  text: string,
  offset: number
): { start: number; end: number; text: string } | undefined {
  if (offset < 0 || offset > text.length) {
    return undefined;
  }
  const isId = (c: string) => /[a-zA-Z0-9_]/.test(c);
  let start = offset;
  let end = offset;
  // Allow cursor at end of identifier
  if (start > 0 && !isId(text[start] ?? "") && isId(text[start - 1] ?? "")) {
    start--;
    end = start + 1;
  }
  while (start > 0 && isId(text[start - 1]!)) {
    start--;
  }
  while (end < text.length && isId(text[end]!)) {
    end++;
  }
  if (start === end) {
    return undefined;
  }

  // Extend left through dotted prefix: ns.name
  let dottedStart = start;
  while (dottedStart > 0 && text[dottedStart - 1] === ".") {
    let p = dottedStart - 1;
    if (p === 0 || !isId(text[p - 1]!)) {
      break;
    }
    p--;
    while (p >= 0 && isId(text[p]!)) {
      p--;
    }
    dottedStart = p + 1;
  }

  return {
    start: dottedStart,
    end,
    text: text.slice(dottedStart, end),
  };
}
