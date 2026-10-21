import * as vscode from "vscode";
import { sharedDocCache } from "./docCache";
import { linkedTagNameRanges } from "./linkedEditing";
import { lineMapFor, rangeFromOffsets } from "./vscodeRanges";

/** Linked editing of paired FTL open/close tag names (plan 0035). */
export class FtlLinkedEditingRangeProvider
  implements vscode.LinkedEditingRangeProvider
{
  provideLinkedEditingRanges(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.LinkedEditingRanges | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const cached = sharedDocCache.get(
      document.uri.toString(),
      document.version,
      text
    );
    const result = linkedTagNameRanges(text, offset, {
      comments: cached.comments,
    });
    if (!result) {
      return undefined;
    }
    const map = lineMapFor(text);
    const ranges = result.ranges.map(([start, end]) =>
      rangeFromOffsets(text, start, end - start, map)
    );
    return new vscode.LinkedEditingRanges(ranges, result.wordPattern);
  }
}
