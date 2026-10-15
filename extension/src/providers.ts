import * as vscode from "vscode";
import { sharedDocCache } from "./docCache";
import {
  findDefinitions,
  identifierAt,
  indexFtl,
} from "./symbols";
import { readUri, resolveImportUri } from "./vscodeIo";
import {
  lineMapFor,
  locationFromOffsets,
  rangeFromOffsets,
} from "./vscodeRanges";

export class FtlDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | undefined> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const id = identifierAt(text, offset);
    if (!id) {
      return undefined;
    }

    const cached = sharedDocCache.get(
      document.uri.toString(),
      document.version,
      text
    );
    const index = cached.index;
    const map = lineMapFor(text);
    const local = findDefinitions(index, id.text);
    if (local.length > 0) {
      return local.map((s) =>
        locationFromOffsets(
          document.uri,
          text,
          s.nameOffset,
          s.nameLength,
          map
        )
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
        const targetUri = resolveImportUri(document.uri, imp.path);
        const targetText = await readUri(targetUri);
        if (targetText) {
          const remote = findDefinitions(indexFtl(targetText), sym);
          const remoteMap = lineMapFor(targetText);
          return remote.map((s) =>
            locationFromOffsets(
              targetUri,
              targetText,
              s.nameOffset,
              s.nameLength,
              remoteMap
            )
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
    const index = sharedDocCache.get(
      document.uri.toString(),
      document.version,
      text
    ).index;
    const map = lineMapFor(text);
    return index.pathRefs.map((ref) => {
      const range = rangeFromOffsets(
        text,
        ref.pathOffset,
        ref.pathLength,
        map
      );
      const target = resolveImportUri(document.uri, ref.path);
      return new vscode.DocumentLink(range, target);
    });
  }
}
