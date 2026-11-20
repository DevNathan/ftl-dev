import * as vscode from "vscode";
import { sharedDocCache } from "./docCache";
import { paramDocumentation } from "./directiveParams";
import {
  builtinHover,
  directiveHover,
  isLiteralTemplatePath,
  symbolHoverAt,
  templatePathAt,
  templatePathHover,
} from "./docs";
import {
  builtinAt,
  clauseKeywordAt,
  directiveAt,
  namedParamAt,
} from "./hoverTokens";

import { identifierAt } from "./symbols";
import { readFsPath, readUri, resolveImportUri } from "./vscodeIo";
import { rangeFromOffsets } from "./vscodeRanges";
import { offsetInFtlComment } from "./comments";
import { ftldocTagHoverAt } from "./ftldocHover";

export class FtlHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const { index, comments } = sharedDocCache.get(
      document.uri.toString(), document.version, text
    );
    const tagHelp = ftldocTagHoverAt(text, offset, comments);
    if (tagHelp) {
      return new vscode.Hover(
        new vscode.MarkdownString(tagHelp.markdown),
        rangeFromOffsets(text, tagHelp.start, tagHelp.end - tagHelp.start)
      );
    }
    if (offsetInFtlComment(offset, comments)) {
      return undefined;
    }
    const ref = templatePathAt(index, offset);
    if (ref) {
      if (document.uri.scheme !== "file" || !isLiteralTemplatePath(text, ref)) {
        return undefined;
      }
      const uri = resolveImportUri(document.uri, ref.path);
      const open = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === uri.toString()
      );
      const target = open?.getText() ?? await readUri(uri);
      const md = templatePathHover(ref.path, target);
      return md
        ? new vscode.Hover(
            new vscode.MarkdownString(md),
            rangeFromOffsets(text, ref.pathOffset, ref.pathLength)
          )
        : undefined;
    }

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
