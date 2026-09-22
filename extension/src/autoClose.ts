import * as vscode from "vscode";
import { autoCloseAfterSlash } from "./closeTag";

/**
 * When `/` is typed in a FreeMarker doc, auto-insert `>` for self-close
 * or rewrite `</` into an opener-aligned `</#name>` / `</@name>`.
 */
export function registerAutoClose(context: vscode.ExtensionContext): void {
  let applying = false;

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (applying) {
        return;
      }
      if (e.document.languageId !== "freemarker") {
        return;
      }
      if (e.contentChanges.length !== 1) {
        return;
      }
      const change = e.contentChanges[0]!;
      if (change.text !== "/" || change.rangeLength !== 0) {
        return;
      }

      const doc = e.document;
      const offset = doc.offsetAt(change.range.start) + 1;
      const edit = autoCloseAfterSlash(doc.getText(), offset);
      if (!edit) {
        return;
      }

      applying = true;
      try {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== doc) {
          return;
        }

        const ok = await editor.edit((builder) => {
          if (edit.replace) {
            const { start, end, text } = edit.replace;
            builder.replace(
              new vscode.Range(doc.positionAt(start), doc.positionAt(end)),
              text
            );
            return;
          }
          if (edit.insertAt !== undefined && edit.insertText !== undefined) {
            builder.insert(doc.positionAt(edit.insertAt), edit.insertText);
          }
        });
        if (ok && edit.cursorAt !== undefined) {
          const pos = doc.positionAt(edit.cursorAt);
          editor.selection = new vscode.Selection(pos, pos);
        }
      } finally {
        applying = false;
      }
    })
  );
}
