import * as path from "path";
import * as vscode from "vscode";
import {
  findDefinitions,
  identifierAt,
  indexFtl,
  lineCharacterToOffset,
  offsetToLineCharacter,
} from "./symbols";

function locationFromOffset(
  uri: vscode.Uri,
  text: string,
  offset: number,
  length: number
): vscode.Location {
  const start = offsetToLineCharacter(text, offset);
  const end = offsetToLineCharacter(text, offset + length);
  return new vscode.Location(
    uri,
    new vscode.Range(
      start.line,
      start.character,
      end.line,
      end.character
    )
  );
}

async function readFtl(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const data = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(data).toString("utf8");
  } catch {
    return undefined;
  }
}

function resolveImportPath(
  fromDoc: vscode.Uri,
  refPath: string
): vscode.Uri {
  if (path.isAbsolute(refPath)) {
    return vscode.Uri.file(refPath);
  }
  const base = path.dirname(fromDoc.fsPath);
  return vscode.Uri.file(path.normalize(path.join(base, refPath)));
}

export class FtlDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | undefined> {
    const text = document.getText();
    const offset = lineCharacterToOffset(
      text,
      position.line,
      position.character
    );
    const id = identifierAt(text, offset);
    if (!id) {
      return undefined;
    }

    const index = indexFtl(text);
    const local = findDefinitions(index, id.text);
    if (local.length > 0) {
      return local.map((s) =>
        locationFromOffset(document.uri, text, s.nameOffset, s.nameLength)
      );
    }

    // ns.symbol → look up import "…" as ns, then find symbol in that file
    const parts = id.text.split(".");
    if (parts.length === 2) {
      const [ns, sym] = parts as [string, string];
      const imp = index.pathRefs.find(
        (p) => p.kind === "import" && p.asName === ns
      );
      if (imp) {
        const targetUri = resolveImportPath(document.uri, imp.path);
        const targetText = await readFtl(targetUri);
        if (targetText) {
          const remote = findDefinitions(indexFtl(targetText), sym);
          return remote.map((s) =>
            locationFromOffset(targetUri, targetText, s.nameOffset, s.nameLength)
          );
        }
      }
    }

    return undefined;
  }
}

export class FtlDocumentLinkProvider
  implements vscode.DocumentLinkProvider
{
  provideDocumentLinks(
    document: vscode.TextDocument
  ): vscode.DocumentLink[] {
    const text = document.getText();
    const index = indexFtl(text);
    return index.pathRefs.map((ref) => {
      const start = offsetToLineCharacter(text, ref.pathOffset);
      const end = offsetToLineCharacter(
        text,
        ref.pathOffset + ref.pathLength
      );
      const range = new vscode.Range(
        start.line,
        start.character,
        end.line,
        end.character
      );
      const target = resolveImportPath(document.uri, ref.path);
      return new vscode.DocumentLink(range, target);
    });
  }
}
