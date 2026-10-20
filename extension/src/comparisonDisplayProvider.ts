import * as vscode from "vscode";
import { ComparisonOp, findComparisonOps } from "./comparisonDisplay";
import { buildLineMap, offsetToPos } from "./lineMap";

const SETTING_KEY = "comparisonOperatorPresentation";
const SETTING_SECTION = "ftl-dev";
const FULL_SETTING_KEY = `${SETTING_SECTION}.${SETTING_KEY}`;

const DISPLAY_COLOR = new vscode.ThemeColor("editor.foreground");
const DISPLAYS = ["<", "<=", ">", ">="] as const;

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

function rangeForOp(
  map: ReturnType<typeof buildLineMap>,
  op: ComparisonOp
): vscode.Range {
  const start = offsetToPos(map, op.offset);
  const end = offsetToPos(map, op.offset + op.length);
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

function isEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(SETTING_SECTION)
    .get<boolean>(SETTING_KEY, false);
}

/** Warn when both old and new extension ids may decorate the same buffer. */
function warnDuplicateFtlDevExtensions(): void {
  const freemarkerExts = vscode.extensions.all.filter((e) => {
    const id = e.id.toLowerCase();
    return id.includes("ftl-dev") || id.includes("freemarker");
  });
  if (freemarkerExts.length <= 1) {
    return;
  }
  const list = freemarkerExts.map((e) => e.id).join(", ");
  void vscode.window
    .showWarningMessage(
      `Multiple FreeMarker extensions are active (${list}). Uninstall the older id (e.g. nathan.ftl-dev) — leftover comparison decorations can corrupt the editor/minimap even when ftl-dev settings are off.`,
      "Open Extensions"
    )
    .then((choice) => {
      if (choice === "Open Extensions") {
        void vscode.commands.executeCommand(
          "workbench.extensions.search",
          "@installed ftl"
        );
      }
    });
}

export function registerComparisonDisplay(
  context: vscode.ExtensionContext
): void {
  /** Created only while the setting is on; disposed when off. */
  let types: Map<string, vscode.TextEditorDecorationType> | undefined;
  /** Editor/document listeners — only while enabled. */
  let live: vscode.Disposable[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const ensureTypes = (): Map<string, vscode.TextEditorDecorationType> => {
    if (types) {
      return types;
    }
    types = new Map();
    for (const display of DISPLAYS) {
      types.set(display, createDecorationType(display));
    }
    return types;
  };

  const disposeTypes = (): void => {
    if (!types) {
      return;
    }
    for (const editor of vscode.window.visibleTextEditors) {
      for (const t of types.values()) {
        editor.setDecorations(t, []);
      }
    }
    for (const t of types.values()) {
      t.dispose();
    }
    types = undefined;
  };

  const refreshEditor = (editor: vscode.TextEditor | undefined): void => {
    if (!editor || editor.document.languageId !== "freemarker") {
      return;
    }

    if (!isEnabled()) {
      disposeTypes();
      return;
    }

    const typeMap = ensureTypes();
    const text = editor.document.getText();
    const map = buildLineMap(text);
    const ops = findComparisonOps(text);
    const buckets = new Map<string, vscode.DecorationOptions[]>();
    for (const display of typeMap.keys()) {
      buckets.set(display, []);
    }

    for (const op of ops) {
      const range = rangeForOp(map, op);
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

    for (const [display, decorationType] of typeMap) {
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
    if (!isEnabled()) {
      disposeTypes();
      return;
    }
    for (const editor of vscode.window.visibleTextEditors) {
      refreshEditor(editor);
    }
  };

  const detachLive = (): void => {
    for (const d of live) {
      d.dispose();
    }
    live = [];
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    disposeTypes();
  };

  const attachLive = (): void => {
    if (live.length > 0) {
      return;
    }
    live = [
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
    ];
  };

  const syncFromSetting = (): void => {
    if (isEnabled()) {
      attachLive();
      refreshVisible();
    } else {
      detachLive();
    }
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(FULL_SETTING_KEY)) {
        syncFromSetting();
      }
    }),
    {
      dispose: () => {
        detachLive();
      },
    }
  );

  warnDuplicateFtlDevExtensions();
  syncFromSetting();
}
