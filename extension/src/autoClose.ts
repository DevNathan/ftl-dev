import * as vscode from "vscode";
import { alignIndentAfterCloser } from "./indentAlign";
import {
  autoCloseAfterSlash,
  autoClosePairOnCloser,
  autoClosePairOnEnter,
} from "./closeTag";

/**
 * `/` — self-close or expand `</` to matching close.
 * `>` / `]` — align mid-block indent; HTML-style insert close tag after caret.
 * Enter — fallback pair+indent when open was pasted without a closer.
 */
export function registerAutoClose(context: vscode.ExtensionContext): void {
  let applying = false;

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
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
      if (change.rangeLength !== 0) {
        return;
      }
      const ch = change.text;
      const doc = e.document;

      if (/^\r?\n[ \t]*$/.test(ch)) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== doc) {
          return;
        }
        const offset = doc.offsetAt(change.range.start) + ch.length;
        const edit = autoClosePairOnEnter(
          doc.getText(),
          offset,
          indentUnitOf(editor)
        );
        if (!edit) {
          return;
        }
        applying = true;
        void (async () => {
          try {
            await applyEdit(doc, edit);
          } finally {
            applying = false;
          }
        })();
        return;
      }

      if (ch !== "/" && ch !== ">" && ch !== "]") {
        return;
      }

      const offset = doc.offsetAt(change.range.start) + ch.length;

      if (ch === "/") {
        const edit = autoCloseAfterSlash(doc.getText(), offset);
        if (!edit) {
          return;
        }
        applying = true;
        void (async () => {
          try {
            await applyEdit(doc, edit);
          } finally {
            applying = false;
          }
        })();
        return;
      }

      // Mid-block outdent first; otherwise HTML-style pair on the closer.
      const align = alignIndentAfterCloser(doc.getText(), offset);
      const pair = align
        ? undefined
        : autoClosePairOnCloser(doc.getText(), offset);
      const edit = align ?? pair;
      if (!edit) {
        return;
      }
      applying = true;
      void (async () => {
        try {
          await applyEdit(doc, edit);
        } finally {
          applying = false;
        }
      })();
    })
  );
}

function indentUnitOf(editor: vscode.TextEditor): string {
  const size = Number(editor.options.tabSize) || 2;
  return editor.options.insertSpaces === false ? "\t" : " ".repeat(size);
}

async function applyEdit(
  doc: vscode.TextDocument,
  edit: {
    replace?: { start: number; end: number; text: string };
    insertAt?: number;
    insertText?: string;
    cursorAt?: number;
  }
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document !== doc) {
    return;
  }

  const ok = await editor.edit(
    (builder) => {
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
    },
    { undoStopBefore: false, undoStopAfter: false }
  );
  if (ok && edit.cursorAt !== undefined) {
    const pos = doc.positionAt(edit.cursorAt);
    editor.selection = new vscode.Selection(pos, pos);
  }
}
