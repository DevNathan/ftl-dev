import * as vscode from "vscode";
import { resolveImportFsPath } from "./imports";

/** Read a UTF-8 file by fs path; undefined if missing / unreadable. */
export async function readFsPath(
  fsPath: string
): Promise<string | undefined> {
  try {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(fsPath));
    return Buffer.from(data).toString("utf8");
  } catch {
    return undefined;
  }
}

export async function readUri(
  uri: vscode.Uri
): Promise<string | undefined> {
  try {
    const data = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(data).toString("utf8");
  } catch {
    return undefined;
  }
}

/** Resolve `#import` / `#include` path relative to the document URI. */
export function resolveImportUri(
  fromDoc: vscode.Uri,
  refPath: string
): vscode.Uri {
  return vscode.Uri.file(resolveImportFsPath(fromDoc.fsPath, refPath));
}
