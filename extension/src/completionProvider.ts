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
    const imported = await collectImportSymbols(
      document.uri.fsPath,
      index,
      readFs
    );

    // Prefer `asFunctionCall` when any decl of that name is a #function.
    const byName = new Map<
      string,
      { name: string; asFunctionCall?: boolean }
    >();
    for (const s of index.symbols) {
      const prev = byName.get(s.name);
      byName.set(s.name, {
        name: s.name,
        asFunctionCall: s.kind === "function" || prev?.asFunctionCall,
      });
    }
    for (const [ns, syms] of imported.byNs) {
      for (const s of syms) {
        const q = `${ns}.${s.name}`;
        const prev = byName.get(q);
        byName.set(q, {
          name: q,
          asFunctionCall: s.kind === "function" || prev?.asFunctionCall,
        });
      }
    }
    const symbols = [...byName.values()];

    const kindMap: Record<string, vscode.CompletionItemKind> = {
      directive: vscode.CompletionItemKind.Keyword,
      builtin: vscode.CompletionItemKind.Method,
      symbol: vscode.CompletionItemKind.Variable,
    };

    return buildCompletions(ctx, symbols).map((c) => {
      const kind =
        c.insertAsSnippet
          ? vscode.CompletionItemKind.Function
          : kindMap[c.kind];
      const item = new vscode.CompletionItem(c.label, kind);
      item.detail = c.detail;
      if (c.documentation) {
        const md = new vscode.MarkdownString(c.documentation);
        md.supportHtml = false;
        item.documentation = md;
      }
      if (c.insertText) {
        // Don't double-up when the user already typed `twice(|`
        const nextCh = document.getText(
          new vscode.Range(position, position.translate(0, 1))
        );
        if (c.insertAsSnippet && nextCh === "(") {
          item.insertText = c.label;
        } else {
          item.insertText = c.insertAsSnippet
            ? new vscode.SnippetString(c.insertText)
            : c.insertText;
        }
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
