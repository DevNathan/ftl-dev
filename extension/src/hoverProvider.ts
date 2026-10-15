import * as vscode from "vscode";
import { sharedDocCache } from "./docCache";
import { builtinHover, directiveHover, symbolHover } from "./docs";
import { builtinAt, directiveAt } from "./hoverTokens";
import { findDefinitions, identifierAt } from "./symbols";
import { readFsPath } from "./vscodeIo";

export class FtlHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // ?builtin — include the '?' in the scan window
    const builtin = builtinAt(text, offset);
    if (builtin) {
      const md = builtinHover(builtin);
      if (md) {
        return new vscode.Hover(new vscode.MarkdownString(md));
      }
    }

    // #directive in <#name / </#name / [#name
    const directive = directiveAt(text, offset);
    if (directive) {
      const md = directiveHover(directive);
      if (md) {
        return new vscode.Hover(new vscode.MarkdownString(md));
      }
    }

    const id = identifierAt(text, offset);
    if (!id) {
      return undefined;
    }

    const cached = await sharedDocCache.getWithImports(
      document.uri.toString(),
      document.version,
      text,
      document.uri.fsPath,
      readFsPath
    );
    const index = cached.index;
    const parts = id.text.split(".");

    if (parts.length === 2) {
      const [ns, sym] = parts as [string, string];
      const hit = cached.importByNs?.get(ns)?.find((s) => s.name === sym);
      if (hit) {
        const imp = index.pathRefs.find(
          (p) => p.kind === "import" && p.asName === ns
        );
        return new vscode.Hover(symbolHover(id.text, hit.kind, imp?.path));
      }
    }

    const local = findDefinitions(index, id.text);
    if (local[0]) {
      return new vscode.Hover(symbolHover(local[0].name, local[0].kind));
    }

    return undefined;
  }
}
