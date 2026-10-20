import * as path from "path";
import * as vscode from "vscode";
import { symbolKindToVscode } from "./symbolKindVscode";
import { readUri } from "./vscodeIo";
import { lineMapFor, locationFromOffsets } from "./vscodeRanges";
import {
  FtlDocInput,
  mergeWorkspaceDocs,
  searchWorkspaceSymbols,
  selectDiskDocsForMerge,
  WORKSPACE_SYMBOL_FIND_FILES_EXCLUDE,
  WORKSPACE_SYMBOL_FIND_FILES_GLOB,
  WORKSPACE_SYMBOL_FIND_FILES_MAX,
} from "./workspaceSymbols";

export {
  WORKSPACE_SYMBOL_FIND_FILES_EXCLUDE,
  WORKSPACE_SYMBOL_FIND_FILES_GLOB,
  WORKSPACE_SYMBOL_FIND_FILES_MAX,
};

export class FtlWorkspaceSymbolProvider
  implements vscode.WorkspaceSymbolProvider
{
  async provideWorkspaceSymbols(
    query: string,
    token: vscode.CancellationToken
  ): Promise<vscode.SymbolInformation[]> {
    const openDocs: FtlDocInput[] = [];
    const openUriSet = new Set<string>();

    for (const doc of vscode.workspace.textDocuments) {
      if (doc.languageId !== "freemarker") {
        continue;
      }
      const uri = doc.uri.toString();
      openUriSet.add(uri);
      openDocs.push({ uri, text: doc.getText() });
    }

    if (token.isCancellationRequested) {
      return [];
    }

    const found = await vscode.workspace.findFiles(
      WORKSPACE_SYMBOL_FIND_FILES_GLOB,
      WORKSPACE_SYMBOL_FIND_FILES_EXCLUDE,
      WORKSPACE_SYMBOL_FIND_FILES_MAX
    );

    const selectedDisk = selectDiskDocsForMerge(
      openUriSet,
      found.map((u) => u.toString())
    );

    const diskDocs: FtlDocInput[] = [];
    for (const uriStr of selectedDisk) {
      if (token.isCancellationRequested) {
        break;
      }
      const text = await readUri(vscode.Uri.parse(uriStr));
      if (text !== undefined) {
        diskDocs.push({ uri: uriStr, text });
      }
    }

    const merged = mergeWorkspaceDocs(openDocs, diskDocs);
    const textByUri = new Map(merged.map((d) => [d.uri, d.text]));

    const symbolHits = searchWorkspaceSymbols(query, merged, {
      isCancelled: () => token.isCancellationRequested,
    });

    return symbolHits.map((hit) => {
      const uri = vscode.Uri.parse(hit.uri);
      const text = textByUri.get(hit.uri) ?? "";
      const map = lineMapFor(text);
      const location = locationFromOffsets(
        uri,
        text,
        hit.nameOffset,
        hit.nameLength,
        map
      );
      return new vscode.SymbolInformation(
        hit.name,
        symbolKindToVscode(hit.kind),
        path.basename(uri.fsPath),
        location
      );
    });
  }
}
