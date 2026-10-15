import * as vscode from "vscode";
import { sharedDocCache } from "./docCache";
import { OutlineSymbol, buildOutline } from "./outline";
import { findReferencesAt } from "./references";
import { SymbolKind } from "./symbols";
import { lineMapFor, rangeFromOffsets } from "./vscodeRanges";
import { offsetToPos } from "./lineMap";

function symbolKindToVscode(kind: SymbolKind): vscode.SymbolKind {
  switch (kind) {
    case "macro":
      return vscode.SymbolKind.Method;
    case "function":
      return vscode.SymbolKind.Function;
    case "assign":
    case "local":
    case "global":
    default:
      return vscode.SymbolKind.Variable;
  }
}

function toDocumentSymbol(
  text: string,
  entry: OutlineSymbol,
  map: ReturnType<typeof lineMapFor>
): vscode.DocumentSymbol {
  const selection = rangeFromOffsets(
    text,
    entry.nameOffset,
    entry.nameLength,
    map
  );
  const range = rangeFromOffsets(
    text,
    entry.rangeOffset,
    entry.rangeLength,
    map
  );
  const sym = new vscode.DocumentSymbol(
    entry.name,
    entry.kind,
    symbolKindToVscode(entry.kind),
    range,
    selection
  );
  sym.children = entry.children.map((c) => toDocumentSymbol(text, c, map));
  return sym;
}

export class FtlDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  provideDocumentSymbols(
    document: vscode.TextDocument
  ): vscode.DocumentSymbol[] {
    const text = document.getText();
    sharedDocCache.get(document.uri.toString(), document.version, text);
    const map = lineMapFor(text);
    return buildOutline(text).map((e) => toDocumentSymbol(text, e, map));
  }
}

export class FtlReferenceProvider implements vscode.ReferenceProvider {
  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext
  ): vscode.Location[] | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const hits = findReferencesAt(text, offset, {
      includeDeclaration: context.includeDeclaration,
    });
    if (!hits) {
      return undefined;
    }
    const map = lineMapFor(text);
    return hits.map((h) => {
      const start = offsetToPos(map, h.startOffset);
      const end = offsetToPos(map, h.endOffset);
      return new vscode.Location(
        document.uri,
        new vscode.Range(
          start.line,
          start.character,
          end.line,
          end.character
        )
      );
    });
  }
}
