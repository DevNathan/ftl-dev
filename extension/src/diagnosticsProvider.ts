import * as vscode from "vscode";
import { diagnosticPositions, validateFtl } from "./diagnostics";

export function registerDiagnostics(
  context: vscode.ExtensionContext
): void {
  const collection = vscode.languages.createDiagnosticCollection("freemarker");
  context.subscriptions.push(collection);

  const refresh = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== "freemarker") {
      return;
    }
    const text = doc.getText();
    const raw = validateFtl(text);
    const diags = raw.map((d) => {
      const pos = diagnosticPositions(text, d);
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

  const refreshVisible = (): void => {
    for (const doc of vscode.workspace.textDocuments) {
      refresh(doc);
    }
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((e) => refresh(e.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)),
    vscode.window.onDidChangeActiveTextEditor((e) => {
      if (e) {
        refresh(e.document);
      }
    })
  );

  refreshVisible();
}
