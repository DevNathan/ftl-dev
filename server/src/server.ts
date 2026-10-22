/**
 * FreeMarker LSP — reuses pure modules from extension/src (no vscode UI).
 * Comparison-operator presentation is intentionally not implemented here
 * (editor-local / VS Code decorations only; see ADR 0005).
 */

import * as fs from "fs";
import * as path from "path";
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  DocumentSymbol,
  InitializeResult,
  InsertTextFormat,
  Location,
  MarkupKind,
  Position,
  Range,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

import {
  buildCompletions,
  completionContext,
} from "../../extension/src/catalog";
import { validateFtl } from "../../extension/src/diagnostics";
import { paramDocumentation } from "../../extension/src/directiveParams";
import { symbolCompletionEntries } from "../../extension/src/completion/helpers";
import {
  builtinHover,
  directiveHover,
  symbolHoverAt,
} from "../../extension/src/docs";
import {
  builtinAt,
  directiveAt,
  namedParamAt,
} from "../../extension/src/context/hoverAtCursor";
import { collectImportSymbols } from "../../extension/src/imports";
import { buildOutlineFromIndex } from "../../extension/src/outline";
import { findReferencesAt } from "../../extension/src/references";
import { signatureHelpAt } from "../../extension/src/signatureHelp";
import {
  findDefinitions,
  identifierAt,
  indexFtl,
  offsetToLineCharacter,
  SymbolKind as FtlSymbolKind,
} from "../../extension/src/symbols";

function posToOffset(doc: TextDocument, pos: Position): number {
  return doc.offsetAt(pos);
}

function rangeFromOffset(
  text: string,
  offset: number,
  length: number
): Range {
  const start = offsetToLineCharacter(text, offset);
  const end = offsetToLineCharacter(text, offset + length);
  return Range.create(
    start.line,
    start.character,
    end.line,
    end.character
  );
}

function ftlKindToLsp(kind: FtlSymbolKind): SymbolKind {
  switch (kind) {
    case "macro":
    case "function":
      return SymbolKind.Function;
    case "assign":
    case "local":
    case "global":
    default:
      return SymbolKind.Variable;
  }
}

function resolveImportPath(fromUri: string, refPath: string): string {
  if (path.isAbsolute(refPath)) {
    return path.normalize(refPath);
  }
  const fromPath = fromUri.startsWith("file:")
    ? fileUrlToPath(fromUri)
    : fromUri;
  return path.normalize(path.join(path.dirname(fromPath), refPath));
}

function fileUrlToPath(uri: string): string {
  let p = uri.replace(/^file:\/\//, "");
  if (process.platform === "win32" && /^\/[A-Za-z]:/.test(p)) {
    p = p.slice(1);
  }
  return decodeURIComponent(p);
}

function pathToFileUrl(fsPath: string): string {
  let p = path.resolve(fsPath).replace(/\\/g, "/");
  if (!p.startsWith("/")) {
    p = "/" + p;
  }
  return "file://" + p;
}

function readFileSyncSafe(fsPath: string): string | undefined {
  try {
    return fs.readFileSync(fsPath, "utf8");
  } catch {
    return undefined;
  }
}

export function startFtlLanguageServer(connection: Connection): void {
  const documents = new TextDocuments(TextDocument);

  connection.onInitialize((): InitializeResult => ({
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ["#", "?", ".", " ", "("],
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ["(", ",", "="],
      },
      documentLinkProvider: { resolveProvider: false },
    },
  }));

  function publishDiagnostics(doc: TextDocument): void {
    const text = doc.getText();
    const diags: Diagnostic[] = validateFtl(text).map((d) => {
      const start = offsetToLineCharacter(text, d.offset);
      const end = offsetToLineCharacter(text, d.offset + d.length);
      return Diagnostic.create(
        Range.create(start.line, start.character, end.line, end.character),
        d.message,
        d.severity === "error"
          ? DiagnosticSeverity.Error
          : d.severity === "information"
            ? DiagnosticSeverity.Information
            : DiagnosticSeverity.Warning,
        undefined,
        "ftl-dev"
      );
    });
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: diags });
  }

  documents.onDidChangeContent((e) => publishDiagnostics(e.document));
  documents.onDidOpen((e) => publishDiagnostics(e.document));
  documents.onDidClose((e) => {
    connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
  });

  connection.onCompletion(async (params): Promise<CompletionItem[]> => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      return [];
    }
    const text = doc.getText();
    const offset = posToOffset(doc, params.position);
    const before = text.slice(0, offset);
    const ctx = completionContext(before);
    const index = indexFtl(text);
    const { byNs } = await collectImportSymbols(
      fileUrlToPath(doc.uri),
      index,
      async (fsPath) => readFileSyncSafe(fsPath)
    );

    // Same entries as the VS Code provider, incl. ftldoc documentation (0038).
    const symbolEntries = symbolCompletionEntries(index, byNs);

    return buildCompletions(ctx, symbolEntries).map((c) => {
      const item: CompletionItem = {
        label: c.label,
        kind:
          c.kind === "directive"
            ? CompletionItemKind.Keyword
            : c.kind === "builtin"
              ? CompletionItemKind.Method
              : CompletionItemKind.Variable,
        detail: c.detail,
        documentation: c.documentation
          ? { kind: MarkupKind.Markdown, value: c.documentation }
          : undefined,
      };
      if (c.insertText) {
        item.insertText = c.insertText;
        if (c.insertAsSnippet) {
          item.insertTextFormat = InsertTextFormat.Snippet;
        }
      }
      return item;
    });
  });

  connection.onHover(async (params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      return undefined;
    }
    const text = doc.getText();
    const offset = posToOffset(doc, params.position);

    // Match VS Code FtlHoverProvider order: builtin → directive → named-param → symbol
    const builtin = builtinAt(text, offset);
    if (builtin) {
      const md = builtinHover(builtin);
      if (md) {
        return { contents: { kind: MarkupKind.Markdown, value: md } };
      }
    }

    const directive = directiveAt(text, offset);
    if (directive) {
      const md = directiveHover(directive);
      if (md) {
        return { contents: { kind: MarkupKind.Markdown, value: md } };
      }
    }

    const param = namedParamAt(text, offset);
    if (param) {
      const blurb = paramDocumentation(param.name);
      if (blurb) {
        return { contents: { kind: MarkupKind.Markdown, value: blurb } };
      }
    }

    if (!identifierAt(text, offset)) {
      return undefined;
    }
    // Same Markdown as VS Code (ftldoc, #local scope, #import ns) — plan 0038 AC11.
    const index = indexFtl(text);
    const { byNs } = await collectImportSymbols(
      fileUrlToPath(doc.uri),
      index,
      async (fsPath) => readFileSyncSafe(fsPath)
    );
    const md = symbolHoverAt(text, offset, index, byNs);
    if (!md) {
      return undefined;
    }
    return { contents: { kind: MarkupKind.Markdown, value: md } };
  });

  connection.onDefinition((params): Location[] | undefined => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      return undefined;
    }
    const text = doc.getText();
    const offset = posToOffset(doc, params.position);
    const id = identifierAt(text, offset);
    if (!id) {
      return undefined;
    }
    const index = indexFtl(text);
    const local = findDefinitions(index, id.text);
    if (local.length > 0) {
      return local.map((s) =>
        Location.create(
          doc.uri,
          rangeFromOffset(text, s.nameOffset, s.nameLength)
        )
      );
    }
    const parts = id.text.split(".");
    if (parts.length === 2) {
      const [ns, sym] = parts as [string, string];
      const imp = index.pathRefs.find(
        (p) => p.kind === "import" && p.asName === ns
      );
      if (imp) {
        const targetPath = resolveImportPath(doc.uri, imp.path);
        const targetText = readFileSyncSafe(targetPath);
        if (targetText) {
          const remote = findDefinitions(indexFtl(targetText), sym);
          const uri = pathToFileUrl(targetPath);
          return remote.map((s) =>
            Location.create(
              uri,
              rangeFromOffset(targetText, s.nameOffset, s.nameLength)
            )
          );
        }
      }
    }
    return undefined;
  });

  connection.onReferences((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      return [];
    }
    const text = doc.getText();
    const offset = posToOffset(doc, params.position);
    const refs = findReferencesAt(text, offset, {
      includeDeclaration: params.context.includeDeclaration,
    });
    if (!refs) {
      return [];
    }
    return refs.map((r) =>
      Location.create(
        doc.uri,
        rangeFromOffset(text, r.startOffset, r.endOffset - r.startOffset)
      )
    );
  });

  connection.onDocumentSymbol((params): DocumentSymbol[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      return [];
    }
    const text = doc.getText();
    const outline = buildOutlineFromIndex(indexFtl(text));
    return outline.map((e) => {
      const range = rangeFromOffset(text, e.nameOffset, e.nameLength);
      return DocumentSymbol.create(
        e.name,
        e.kind,
        ftlKindToLsp(e.kind),
        range,
        range
      );
    });
  });

  connection.onSignatureHelp(async (params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      return undefined;
    }
    const text = doc.getText();
    const offset = posToOffset(doc, params.position);
    const local = indexFtl(text);
    const { byNs } = await collectImportSymbols(
      fileUrlToPath(doc.uri),
      local,
      async (fsPath) => readFileSyncSafe(fsPath)
    );
    const help = signatureHelpAt(text, offset, { local, byNs });
    if (!help) {
      return undefined;
    }
    return {
      signatures: [
        {
          label: help.label,
          parameters: help.parameters.map((p) =>
            p.documentation
              ? {
                  label: p.label,
                  documentation: {
                    kind: MarkupKind.Markdown,
                    value: p.documentation,
                  },
                }
              : { label: p.label }
          ),
          documentation:
            help.documentation && help.documentationMarkdown
              ? { kind: MarkupKind.Markdown, value: help.documentation }
              : help.documentation,
        },
      ],
      activeSignature: 0,
      activeParameter: help.activeParameter,
    };
  });

  connection.onDocumentLinks((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      return [];
    }
    const text = doc.getText();
    const index = indexFtl(text);
    return index.pathRefs.map((ref) => ({
      range: rangeFromOffset(text, ref.pathOffset, ref.pathLength),
      target: pathToFileUrl(resolveImportPath(doc.uri, ref.path)),
    }));
  });

  documents.listen(connection);
}
