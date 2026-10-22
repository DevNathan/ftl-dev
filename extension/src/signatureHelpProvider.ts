import * as vscode from "vscode";
import { isInFtlComment } from "./comments";
import { sharedDocCache } from "./docCache";
import { signatureHelpAt } from "./signatureHelp";
import { readFsPath } from "./vscodeIo";

export class FtlSignatureHelpProvider
  implements vscode.SignatureHelpProvider
{
  async provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext
  ): Promise<vscode.SignatureHelp | undefined> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    if (isInFtlComment(text, offset)) {
      return undefined;
    }
    const cached = await sharedDocCache.getWithImports(
      document.uri.toString(),
      document.version,
      text,
      document.uri.fsPath,
      readFsPath
    );
    const result = signatureHelpAt(text, offset, {
      local: cached.index,
      byNs: cached.importByNs ?? new Map(),
    });
    if (!result) {
      return undefined;
    }

    const sig = new vscode.SignatureInformation(result.label);
    if (result.documentation) {
      sig.documentation = result.documentationMarkdown
        ? markdown(result.documentation)
        : result.documentation;
    }
    sig.parameters = result.parameters.map((p) =>
      p.documentation
        ? new vscode.ParameterInformation(p.label, markdown(p.documentation))
        : new vscode.ParameterInformation(p.label)
    );

    const help = new vscode.SignatureHelp();
    help.signatures = [sig];
    help.activeSignature = 0;
    help.activeParameter = result.activeParameter;
    return help;
  }
}

/** ftldoc Markdown (plan 0038 D8); raw HTML stays off. */
function markdown(value: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString(value);
  md.supportHtml = false;
  return md;
}
