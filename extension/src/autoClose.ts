import * as vscode from "vscode";
import { alignIndentAfterCloser } from "./indentAlign";
import {
  autoCloseAfterSlash,
  autoClosePairOnCloser,
  autoClosePairOnEnter,
  CloseEdit,
} from "./closeTag";

type AutoEdit = CloseEdit & {
  replace?: { start: number; end: number; text: string };
};

/**
 * `/` — self-close or expand `</` to matching close.
 * `>` / `]` (or longer inserts ending with them) — align mid-block (`#recover`,
 * `#else`, …) / close-tag indent to the opener; single-char `>` / `]` also
 * HTML-style pair after an open tag.
 * Enter — fallback pair+indent when open was pasted without a closer.
 */
export function registerAutoClose(context: vscode.ExtensionContext): void {
  let applying = false;

  const runEdit = (doc: vscode.TextDocument, edit: AutoEdit): void => {
    applying = true;
    void (async () => {
      try {
        await applyEdit(doc, edit);
      } finally {
        applying = false;
      }
    })();
  };

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
      const offset = doc.offsetAt(change.range.start) + ch.length;

      if (/^\r?\n[ \t]*$/.test(ch)) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== doc) {
          return;
        }
        const edit = autoClosePairOnEnter(
          doc.getText(),
          offset,
          indentUnitOf(editor)
        );
        if (edit) {
          runEdit(doc, edit);
        }
        return;
      }

      if (ch === "/") {
        const edit = autoCloseAfterSlash(doc.getText(), offset);
        if (edit) {
          runEdit(doc, edit);
        }
        return;
      }

      // Single `>` / `]`, or a longer insert that finishes a tag (autocomplete
      // completing `</#attempt>` / `<#recover>`). Only single-char closers pair.
      const endsWithCloser = ch.endsWith(">") || ch.endsWith("]");
      if (!endsWithCloser) {
        return;
      }

      const align = alignIndentAfterCloser(doc.getText(), offset);
      const pair =
        align || (ch !== ">" && ch !== "]")
          ? undefined
          : autoClosePairOnCloser(doc.getText(), offset);
      const edit = align ?? pair;
      if (edit) {
        runEdit(doc, edit);
      }
    })
  );
}

function indentUnitOf(editor: vscode.TextEditor): string {
  const size = Number(editor.options.tabSize) || 2;
  return editor.options.insertSpaces === false ? "\t" : " ".repeat(size);
}

async function applyEdit(
  doc: vscode.TextDocument,
  edit: AutoEdit
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
