import * as vscode from "vscode";
import { buildCompletions, completionContext } from "./catalog";
import { isInFtlComment } from "./comments";
import { sharedDocCache } from "./docCache";
import { readFsPath } from "./vscodeIo";

export class FtlCompletionProvider
  implements vscode.CompletionItemProvider
{
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    // `.` / `#` / `?` are trigger chars — do not open the suggest widget inside
    // FTL comments (e.g. typing a period in ftldoc prose).
    if (isInFtlComment(text, offset)) {
      return [];
    }
    const before = text.slice(0, offset);
    const ctx = completionContext(before);
    const cached = await sharedDocCache.getWithImports(
      document.uri.toString(),
      document.version,
      text,
      document.uri.fsPath,
      readFsPath
    );
    const index = cached.index;
    const imported = {
      byNs: cached.importByNs ?? new Map(),
    };

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
      property: vscode.CompletionItemKind.Property,
      constant: vscode.CompletionItemKind.Constant,
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
        ctx.type === "special" ||
        ctx.type === "general" ||
        ctx.type === "ns" ||
        ctx.type === "directiveParam"
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
