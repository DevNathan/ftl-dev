import * as vscode from "vscode";
import { sharedDocCache } from "./docCache";
import {
  FTL_SEMANTIC_TOKEN_TYPES,
  buildSemanticTokenSpansFromIndex,
  encodeSemanticTokenSpans,
} from "./semanticTokens";
import { readFsPath } from "./vscodeIo";

export { FTL_SEMANTIC_TOKEN_TYPES };

export class FtlSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider
{
  async provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): Promise<vscode.SemanticTokens> {
    const text = document.getText();
    const cached = await sharedDocCache.getWithImports(
      document.uri.toString(),
      document.version,
      text,
      document.uri.fsPath,
      readFsPath
    );
    const spans = buildSemanticTokenSpansFromIndex(text, cached.index, {
      importedByNs: cached.importByNs,
      comments: cached.comments,
    });
    const data = encodeSemanticTokenSpans(spans, { alreadySorted: true });
    return new vscode.SemanticTokens(data);
  }
}
