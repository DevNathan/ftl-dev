import * as vscode from "vscode";
import { buildCompletions, completionContext } from "./catalog";
import { collectImportSymbols } from "./imports";
import { indexFtl, lineCharacterToOffset } from "./symbols";

async function readFs(fsPath: string): Promise<string | undefined> {
  try {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(fsPath));
    return Buffer.from(data).toString("utf8");
  } catch {
    return undefined;
  }
}

export class FtlCompletionProvider
  implements vscode.CompletionItemProvider
{
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const text = document.getText();
    const offset = lineCharacterToOffset(
      text,
      position.line,
      position.character
    );
    const before = text.slice(0, offset);
    const ctx = completionContext(before);
    const index = indexFtl(text);
    const local = [...new Set(index.symbols.map((s) => s.name))];
    const imported = await collectImportSymbols(
      document.uri.fsPath,
      index,
      readFs
    );
    const symbolNames = [...local, ...imported.qualified];

    const kindMap: Record<string, vscode.CompletionItemKind> = {
      directive: vscode.CompletionItemKind.Keyword,
      builtin: vscode.CompletionItemKind.Method,
      symbol: vscode.CompletionItemKind.Variable,
    };

    return buildCompletions(ctx, symbolNames).map((c) => {
      const item = new vscode.CompletionItem(c.label, kindMap[c.kind]);
      item.detail = c.detail;
      if (c.documentation) {
        const md = new vscode.MarkdownString(c.documentation);
        md.supportHtml = false;
        item.documentation = md;
      }
      if (c.insertText) {
        item.insertText = c.insertText;
      }
      const prefixLen =
        ctx.type === "directive" ||
        ctx.type === "builtin" ||
        ctx.type === "general" ||
        ctx.type === "ns"
          ? ctx.prefix.length
          : 0;
      if (prefixLen > 0) {
        item.range = new vscode.Range(
          position.translate(0, -prefixLen),
          position
        );
      }
      return item;
    });
  }
}
