import * as vscode from "vscode";
import { ComparisonOp, findComparisonOps } from "./comparisonDisplay";
import { offsetToLineCharacter } from "./symbols";

const SETTING_KEY = "ftl-dev.comparisonOperatorPresentation";

const DISPLAY_COLOR = new vscode.ThemeColor("editor.foreground");

function createDecorationType(
  display: string
): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    opacity: "0",
    // Collapse source token width so after.contentText sits in place
    letterSpacing: "-100px",
    after: {
      contentText: display,
      color: DISPLAY_COLOR,
      fontStyle: "normal",
      fontWeight: "normal",
    },
  });
}

function rangeForOp(text: string, op: ComparisonOp): vscode.Range {
  const start = offsetToLineCharacter(text, op.offset);
  const end = offsetToLineCharacter(text, op.offset + op.length);
  return new vscode.Range(
    start.line,
    start.character,
    end.line,
    end.character
  );
}

function overlapsSelection(
  range: vscode.Range,
  selections: readonly vscode.Selection[]
): boolean {
  for (const sel of selections) {
    if (sel.intersection(range)) {
      return true;
    }
    // Empty caret: intersection with zero-width may be null at edges;
    // treat contained caret as overlap.
    if (sel.isEmpty && range.contains(sel.active)) {
      return true;
    }
  }
  return false;
}

export function registerComparisonDisplay(
  context: vscode.ExtensionContext
): void {
  const types = new Map<string, vscode.TextEditorDecorationType>();
  for (const display of ["<", "<=", ">", ">="]) {
    const t = createDecorationType(display);
    types.set(display, t);
    context.subscriptions.push(t);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearEditor = (editor: vscode.TextEditor): void => {
    for (const t of types.values()) {
      editor.setDecorations(t, []);
    }
  };

  const refreshEditor = (editor: vscode.TextEditor | undefined): void => {
    if (!editor || editor.document.languageId !== "freemarker") {
      return;
    }

    const enabled = vscode.workspace
      .getConfiguration()
      .get<boolean>(SETTING_KEY, false);
    if (!enabled) {
      clearEditor(editor);
      return;
    }

    const text = editor.document.getText();
    const ops = findComparisonOps(text);
    const buckets = new Map<string, vscode.DecorationOptions[]>();
    for (const display of types.keys()) {
      buckets.set(display, []);
    }

    for (const op of ops) {
      const range = rangeForOp(text, op);
      if (overlapsSelection(range, editor.selections)) {
        continue;
      }
      const list = buckets.get(op.display);
      if (!list) {
        continue;
      }
      list.push({
        range,
        hoverMessage: new vscode.MarkdownString(
          `\`${op.token}\` (displayed as \`${op.display}\`)`
        ),
      });
    }

    for (const [display, decorationType] of types) {
      editor.setDecorations(decorationType, buckets.get(display) ?? []);
    }
  };

  const scheduleRefresh = (editor: vscode.TextEditor | undefined): void => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => refreshEditor(editor), 60);
  };

  const refreshVisible = (): void => {
    for (const editor of vscode.window.visibleTextEditors) {
      refreshEditor(editor);
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e) => refreshEditor(e)),
    vscode.window.onDidChangeVisibleTextEditors(() => refreshVisible()),
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor.document.languageId === "freemarker") {
        refreshEditor(e.textEditor);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId !== "freemarker") {
        return;
      }
      for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document === e.document) {
          scheduleRefresh(editor);
        }
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(SETTING_KEY)) {
        refreshVisible();
      }
    }),
    {
      dispose: () => {
        if (timer) {
          clearTimeout(timer);
        }
      },
    }
  );

  refreshVisible();
}
