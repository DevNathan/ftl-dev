import * as vscode from "vscode";
import { collectImportSymbols } from "./imports";
import { signatureHelpAt } from "./signatureHelp";
import { indexFtl, lineCharacterToOffset } from "./symbols";

async function readFs(fsPath: string): Promise<string | undefined> {
  try {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(fsPath));
    return Buffer.from(data).toString("utf8");
  } catch {
    return undefined;
  }
}

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
    const offset = lineCharacterToOffset(
      text,
      position.line,
      position.character
    );
    const local = indexFtl(text);
    const imported = await collectImportSymbols(
      document.uri.fsPath,
      local,
      readFs
    );
    const result = signatureHelpAt(text, offset, {
      local,
      byNs: imported.byNs,
    });
    if (!result) {
      return undefined;
    }

    const sig = new vscode.SignatureInformation(result.label);
    if (result.documentation) {
      sig.documentation = result.documentation;
    }
    sig.parameters = result.parameters.map(
      (p) => new vscode.ParameterInformation(p.label)
    );

    const help = new vscode.SignatureHelp();
    help.signatures = [sig];
    help.activeSignature = 0;
    help.activeParameter = result.activeParameter;
    return help;
  }
}
