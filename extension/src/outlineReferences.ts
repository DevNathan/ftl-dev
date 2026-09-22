import * as vscode from "vscode";
import { OutlineSymbol, buildOutline } from "./outline";
import { findReferencesAt } from "./references";
import {
  SymbolKind,
  lineCharacterToOffset,
  offsetToLineCharacter,
} from "./symbols";

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

function rangeFromOffsets(
  text: string,
  offset: number,
  length: number
): vscode.Range {
  const start = offsetToLineCharacter(text, offset);
  const end = offsetToLineCharacter(text, offset + length);
  return new vscode.Range(
    start.line,
    start.character,
    end.line,
    end.character
  );
}

function toDocumentSymbol(
  text: string,
  entry: OutlineSymbol
): vscode.DocumentSymbol {
  const selection = rangeFromOffsets(text, entry.nameOffset, entry.nameLength);
  const range = rangeFromOffsets(text, entry.rangeOffset, entry.rangeLength);
  const sym = new vscode.DocumentSymbol(
    entry.name,
    entry.kind,
    symbolKindToVscode(entry.kind),
    range,
    selection
  );
  sym.children = entry.children.map((c) => toDocumentSymbol(text, c));
  return sym;
}

export class FtlDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  provideDocumentSymbols(
    document: vscode.TextDocument
  ): vscode.DocumentSymbol[] {
    const text = document.getText();
    return buildOutline(text).map((e) => toDocumentSymbol(text, e));
  }
}

export class FtlReferenceProvider implements vscode.ReferenceProvider {
  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext
  ): vscode.Location[] | undefined {
    const text = document.getText();
    const offset = lineCharacterToOffset(
      text,
      position.line,
      position.character
    );
    const hits = findReferencesAt(text, offset, {
      includeDeclaration: context.includeDeclaration,
    });
    if (!hits) {
      return undefined;
    }
    return hits.map((h) => {
      const start = offsetToLineCharacter(text, h.startOffset);
      const end = offsetToLineCharacter(text, h.endOffset);
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
