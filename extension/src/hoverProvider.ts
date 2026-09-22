import * as vscode from "vscode";
import { builtinHover, directiveHover, symbolHover } from "./docs";
import { collectImportSymbols } from "./imports";
import {
  findDefinitions,
  identifierAt,
  indexFtl,
  lineCharacterToOffset,
} from "./symbols";

async function readFs(fsPath: string): Promise<string | undefined> {
  try {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(fsPath));
    return Buffer.from(data).toString("utf8");
  } catch {
    return undefined;
  }
}

export class FtlHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const text = document.getText();
    const offset = lineCharacterToOffset(
      text,
      position.line,
      position.character
    );

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

    const index = indexFtl(text);
    const parts = id.text.split(".");

    if (parts.length === 2) {
      const [ns, sym] = parts as [string, string];
      const imported = await collectImportSymbols(
        document.uri.fsPath,
        index,
        readFs
      );
      const hit = imported.byNs.get(ns)?.find((s) => s.name === sym);
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

function builtinAt(text: string, offset: number): string | undefined {
  // Walk left to start of identifier, require preceding '?'
  let end = offset;
  if (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
      end++;
    }
  }
  let start = Math.min(offset, end);
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1]!)) {
    start--;
  }
  if (start > 0 && text[start - 1] === "?") {
    const name = text.slice(start, end);
    return name || undefined;
  }
  return undefined;
}

function directiveAt(text: string, offset: number): string | undefined {
  let end = offset;
  if (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
    while (end < text.length && /[a-zA-Z0-9_]/.test(text[end]!)) {
      end++;
    }
  }
  let start = Math.min(offset, end);
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1]!)) {
    start--;
  }
  const name = text.slice(start, end);
  if (!name) {
    return undefined;
  }
  // Look back for <# or </# or [# or [/#
  const prefix = text.slice(Math.max(0, start - 3), start);
  if (
    prefix.endsWith("<#") ||
    prefix.endsWith("[#") ||
    prefix.endsWith("</#") ||
    prefix.endsWith("[/#")
  ) {
    return name;
  }
  return undefined;
}
