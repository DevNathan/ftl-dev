import * as vscode from "vscode";
import { sharedDocCache } from "./docCache";
import { paramDocumentation } from "./directiveParams";
import { builtinHover, directiveHover, symbolHoverAt } from "./docs";
import {
  builtinAt,
  clauseKeywordAt,
  directiveAt,
  namedParamAt,
} from "./hoverTokens";

import { identifierAt } from "./symbols";
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

    // Known #ftl / #setting / #include named-param LHS, or clause as/in/using
    const param = namedParamAt(text, offset) ?? clauseKeywordAt(text, offset);
    if (param) {
      const blurb = paramDocumentation(param.name);
      if (blurb) {
        return new vscode.Hover(new vscode.MarkdownString(blurb));
      }
    }

    if (!identifierAt(text, offset)) {
      return undefined;
    }

    const cached = await sharedDocCache.getWithImports(
      document.uri.toString(),
      document.version,
      text,
      document.uri.fsPath,
      readFsPath
    );
    const md = symbolHoverAt(text, offset, cached.index, cached.importByNs);
    if (md) {
      return new vscode.Hover(md);
    }

    return undefined;
  }
}
