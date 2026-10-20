import * as vscode from "vscode";
import { sharedDocCache } from "./docCache";
import { renameSymbolAt } from "./references";
import { identifierAt } from "./symbols";
import { lineMapFor, rangeFromOffsets } from "./vscodeRanges";

export class FtlRenameProvider implements vscode.RenameProvider {
  prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Range | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const id = identifierAt(text, offset);
    if (!id) {
      return undefined;
    }
    const map = lineMapFor(text);
    return rangeFromOffsets(text, id.start, id.end - id.start, map);
  }

  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string
  ): vscode.WorkspaceEdit | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const cached = sharedDocCache.get(
      document.uri.toString(),
      document.version,
      text
    );
    const edits = renameSymbolAt(text, offset, newName, {
      index: cached.index,
      comments: cached.comments,
    });
    if (!edits || edits.length === 0) {
      return undefined;
    }
    const map = lineMapFor(text);
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const e of edits) {
      const range = rangeFromOffsets(
        text,
        e.startOffset,
        e.endOffset - e.startOffset,
        map
      );
      workspaceEdit.replace(document.uri, range, e.newText);
    }
    return workspaceEdit;
  }
}
