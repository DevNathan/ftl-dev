import * as vscode from "vscode";
import { buildLineMap, LineMap, offsetToPos } from "./lineMap";
import { offsetToLineCharacter } from "./symbols";

export function rangeFromOffsets(
  text: string,
  offset: number,
  length: number,
  map?: LineMap
): vscode.Range {
  const start = map
    ? offsetToPos(map, offset)
    : offsetToLineCharacter(text, offset);
  const end = map
    ? offsetToPos(map, offset + length)
    : offsetToLineCharacter(text, offset + length);
  return new vscode.Range(
    start.line,
    start.character,
    end.line,
    end.character
  );
}

export function locationFromOffsets(
  uri: vscode.Uri,
  text: string,
  offset: number,
  length: number,
  map?: LineMap
): vscode.Location {
  return new vscode.Location(uri, rangeFromOffsets(text, offset, length, map));
}

/** Build a line map once for repeated range mapping on the same text. */
export function lineMapFor(text: string): LineMap {
  return buildLineMap(text);
}
