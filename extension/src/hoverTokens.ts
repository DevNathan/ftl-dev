/** Pure cursor helpers for hover (?builtin / #directive). */

export function builtinAt(text: string, offset: number): string | undefined {
  // Walk left to start of identifier, require preceding '?'
  let end = offset;
  if (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
      end++;
    }
  }
  let start = Math.min(offset, end);
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1]!)) {
    start--;
  }
  if (start > 0 && text[start - 1] === "?") {
    const name = text.slice(start, end);
    return name || undefined;
  }
  return undefined;
}

export function directiveAt(text: string, offset: number): string | undefined {
  let end = offset;
  if (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
      end++;
    }
  }
  let start = Math.min(offset, end);
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1]!)) {
    start--;
  }
  const name = text.slice(start, end);
  if (!name) {
    return undefined;
  }
  // Look back for <# or </# or [# or [/#
  const prefix = text.slice(Math.max(0, start - 3), start);
  if (
    prefix.endsWith("<#") ||
    prefix.endsWith("[#") ||
    prefix.endsWith("</#") ||
    prefix.endsWith("[/#")
  ) {
    return name;
  }
  return undefined;
}
