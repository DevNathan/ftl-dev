import * as vscode from "vscode";
import { diagnosticPositions, validateFtl } from "./diagnostics";
import { buildLineMap } from "./lineMap";
import { sharedDocCache } from "./docCache";

const DEBOUNCE_MS = 200;

export function registerDiagnostics(
  context: vscode.ExtensionContext
): void {
  const collection = vscode.languages.createDiagnosticCollection("freemarker");
  context.subscriptions.push(collection);

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Latest scheduled version per URI — drop stale debounce callbacks. */
  const pendingVersion = new Map<string, number>();

  const refreshNow = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== "freemarker") {
      return;
    }
    const text = doc.getText();
    const raw = validateFtl(text);
    const map = buildLineMap(text);
    const diags = raw.map((d) => {
      const pos = diagnosticPositions(text, d, map);
      const range = new vscode.Range(
        pos.line,
        pos.character,
        pos.endLine,
        pos.endCharacter
      );
      const severity =
        d.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning;
      return new vscode.Diagnostic(range, d.message, severity);
    });
    collection.set(doc.uri, diags);
  };

  const scheduleRefresh = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== "freemarker") {
      return;
    }
    const key = doc.uri.toString();
    pendingVersion.set(key, doc.version);
    const prev = timers.get(key);
    if (prev) {
      clearTimeout(prev);
    }
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        if (pendingVersion.get(key) !== doc.version) {
          return;
        }
        // Document may have closed or been replaced
        const open = vscode.workspace.textDocuments.find(
          (d) => d.uri.toString() === key
        );
        if (!open || open.version !== doc.version) {
          return;
        }
        refreshNow(open);
      }, DEBOUNCE_MS)
    );
  };

  const refreshVisible = (): void => {
    for (const doc of vscode.workspace.textDocuments) {
      refreshNow(doc);
    }
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refreshNow),
    vscode.workspace.onDidChangeTextDocument((e) => {
      sharedDocCache.delete(e.document.uri.toString());
      scheduleRefresh(e.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      const key = doc.uri.toString();
      const t = timers.get(key);
      if (t) {
        clearTimeout(t);
        timers.delete(key);
      }
      pendingVersion.delete(key);
      sharedDocCache.delete(key);
      collection.delete(doc.uri);
    }),
    vscode.window.onDidChangeActiveTextEditor((e) => {
      if (e) {
        refreshNow(e.document);
      }
    }),
    {
      dispose: () => {
        for (const t of timers.values()) {
          clearTimeout(t);
        }
        timers.clear();
      },
    }
  );

  refreshVisible();
}
