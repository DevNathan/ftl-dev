import * as vscode from "vscode";
import { alignIndentAfterCloser } from "./indentAlign";
import {
  autoCloseAfterSlash,
  autoClosePairOnCloser,
  autoClosePairOnEnter,
  CloseEdit,
  isDuplicateCloser,
  SelfCloseMark,
  selfCloseMarkFor,
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
 *
 * Duplicate-closer guard (plan 0034 AC9): after a self-close `/` → `/>`, a `>`
 * (`]`) typed as the very next change right after our closer is removed, so
 * the line reads `/>` instead of `/>>`. Decision is `isDuplicateCloser`.
 */
export function registerAutoClose(context: vscode.ExtensionContext): void {
  let applying = false;
  /**
   * Set after a successful self-close insert; consumed or cleared by the next
   * change to that document. Fast-typing race: a change that arrives while
   * `applying` is true is ignored by the listener (as for every auto-edit).
   * If that happens between our `/` edit request and its completion, the
   * version gap makes `selfCloseMarkFor` return undefined, so no mark is set
   * and the miss is accepted (user may see `/>>`, the pre-0034 behavior)
   * instead of guessing where the in-flight `>` landed.
   */
  let mark: SelfCloseMark | undefined;

  const runEdit = (
    doc: vscode.TextDocument,
    edit: AutoEdit,
    onApplied?: (ok: boolean) => void
  ): void => {
    applying = true;
    void (async () => {
      let ok = false;
      try {
        ok = await applyEdit(doc, edit);
      } finally {
        applying = false;
      }
      onApplied?.(ok);
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
      const doc = e.document;
      // Duplicate-closer guard runs before every other branch. Any change to
      // the marked document consumes the mark (one use; no stale state).
      const pending = mark;
      if (pending && pending.uri === doc.uri.toString()) {
        mark = undefined;
        if (e.contentChanges.length === 1) {
          const c = e.contentChanges[0]!;
          const at = doc.offsetAt(c.range.start);
          if (
            isDuplicateCloser(pending, {
              uri: doc.uri.toString(),
              version: doc.version,
              offset: at,
              text: c.text,
              rangeLength: c.rangeLength,
            })
          ) {
            // Delete the typed duplicate; caret stays right after our closer.
            runEdit(doc, {
              replace: { start: at, end: at + 1, text: "" },
              cursorAt: at,
            });
            return;
          }
        }
      }
      if (e.contentChanges.length !== 1) {
        return;
      }
      const change = e.contentChanges[0]!;
      if (change.rangeLength !== 0) {
        return;
      }
      const ch = change.text;
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
          const uri = doc.uri.toString();
          const versionBefore = doc.version;
          runEdit(doc, edit, (ok) => {
            mark = ok
              ? selfCloseMarkFor(edit, uri, versionBefore, doc.version)
              : undefined;
          });
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
): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document !== doc) {
    return false;
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
  return ok;
}
