import * as vscode from "vscode";
import { registerAutoClose } from "./autoClose";
import { registerComparisonDisplay } from "./comparisonDisplayProvider";
import { FtlCompletionProvider } from "./completionProvider";
import { registerDiagnostics } from "./diagnosticsProvider";
import { FtlHoverProvider } from "./hoverProvider";
import {
  FtlDocumentSymbolProvider,
  FtlReferenceProvider,
} from "./outlineReferences";
import { FtlRenameProvider } from "./renameProvider";
import { FtlWorkspaceSymbolProvider } from "./workspaceSymbolProvider";
import {
  FtlDefinitionProvider,
  FtlDocumentLinkProvider,
} from "./providers";
import { FtlSignatureHelpProvider } from "./signatureHelpProvider";
import {
  FTL_SEMANTIC_TOKEN_TYPES,
  FtlSemanticTokensProvider,
} from "./semanticTokensProvider";

const FTL_SELECTOR: vscode.DocumentSelector = { language: "freemarker" };

export function activate(context: vscode.ExtensionContext): void {
  console.log("ftl-dev: FreeMarker extension activated");

  registerAutoClose(context);
  registerDiagnostics(context);
  registerComparisonDisplay(context);

  const legend = new vscode.SemanticTokensLegend([...FTL_SEMANTIC_TOKEN_TYPES]);

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      FTL_SELECTOR,
      new FtlDefinitionProvider()
    ),
    vscode.languages.registerDocumentLinkProvider(
      FTL_SELECTOR,
      new FtlDocumentLinkProvider()
    ),
    vscode.languages.registerCompletionItemProvider(
      FTL_SELECTOR,
      new FtlCompletionProvider(),
      "#",
      "?",
      ".",
      "<",
      "[",
      "/"
    ),
    vscode.languages.registerHoverProvider(FTL_SELECTOR, new FtlHoverProvider()),
    vscode.languages.registerSignatureHelpProvider(
      FTL_SELECTOR,
      new FtlSignatureHelpProvider(),
      "(",
      ",",
      "="
    ),
    vscode.languages.registerDocumentSymbolProvider(
      FTL_SELECTOR,
      new FtlDocumentSymbolProvider()
    ),
    vscode.languages.registerWorkspaceSymbolProvider(
      new FtlWorkspaceSymbolProvider()
    ),
    vscode.languages.registerReferenceProvider(
      FTL_SELECTOR,
      new FtlReferenceProvider()
    ),
    vscode.languages.registerRenameProvider(
      FTL_SELECTOR,
      new FtlRenameProvider()
    ),
    vscode.languages.registerDocumentSemanticTokensProvider(
      FTL_SELECTOR,
      new FtlSemanticTokensProvider(),
      legend
    )
  );
}

export function deactivate(): void {
  // no-op
}
