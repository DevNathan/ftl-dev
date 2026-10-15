/**
 * Precomputed line-start offsets for O(log n) offset → line/character.
 * Prefer this when mapping many positions in one document.
 */

export type LineMap = {
  /** Absolute offset of the first character of each line (line 0 = 0). */
  starts: number[];
  length: number;
};

export function buildLineMap(text: string): LineMap {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return { starts, length: text.length };
}

export function offsetToPos(
  map: LineMap,
  offset: number
): { line: number; character: number } {
  const o = Math.max(0, Math.min(offset, map.length));
  const starts = map.starts;
  // Binary search: greatest start <= o
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= o) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return { line: lo, character: o - starts[lo]! };
}

export function lineCharacterToOffsetMapped(
  map: LineMap,
  line: number,
  character: number
): number {
  if (line < 0) {
    return 0;
  }
  if (line >= map.starts.length) {
    return map.length;
  }
  return Math.min(map.starts[line]! + character, map.length);
}
