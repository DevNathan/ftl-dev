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
import {
  FtlDefinitionProvider,
  FtlDocumentLinkProvider,
} from "./providers";
import { FtlSignatureHelpProvider } from "./signatureHelpProvider";
import {
  FTL_SEMANTIC_TOKEN_TYPES,
  semanticTokensForDocument,
} from "./semanticTokens";

const FTL_SELECTOR: vscode.DocumentSelector = { language: "freemarker" };

async function readFs(fsPath: string): Promise<string | undefined> {
  try {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(fsPath));
    return Buffer.from(data).toString("utf8");
  } catch {
    return undefined;
  }
}

class FtlSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider
{
  async provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): Promise<vscode.SemanticTokens> {
    const data = await semanticTokensForDocument(
      document.getText(),
      document.uri.fsPath,
      readFs
    );
    return new vscode.SemanticTokens(data);
  }
}

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
    vscode.languages.registerReferenceProvider(
      FTL_SELECTOR,
      new FtlReferenceProvider()
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
