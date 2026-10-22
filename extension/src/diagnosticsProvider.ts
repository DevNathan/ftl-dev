import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
  DataModelRootsCache,
  FTL_DATA_MODEL_FILENAME,
  mergeDataModelAllowlist,
  rootsForTemplatePath,
  type DataModelFileReadResult,
} from "./dataModelFile";
import { diagnosticPositions, validateFtl } from "./diagnostics";
import { buildLineMap } from "./lineMap";
import { sharedDocCache } from "./docCache";

const DEBOUNCE_MS = 200;

export function registerDiagnostics(
  context: vscode.ExtensionContext
): void {
  const collection = vscode.languages.createDiagnosticCollection("freemarker");
  context.subscriptions.push(collection);

  const output = vscode.window.createOutputChannel("FTL Dev");
  context.subscriptions.push(output);

  const dataModelCache = new DataModelRootsCache();
  /** Throttle identical Output warnings per folder key. */
  const lastWarnByFolder = new Map<string, string>();

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Latest scheduled version per URI — drop stale debounce callbacks. */
  const pendingVersion = new Map<string, number>();

  const readStrictOptions = (): {
    strictVariables: boolean;
    dataModel: readonly string[];
  } => {
    const cfg = vscode.workspace.getConfiguration("ftl-dev");
    const dataModelRaw = cfg.get<unknown>("dataModel", []);
    const dataModel = Array.isArray(dataModelRaw)
      ? dataModelRaw.filter((x): x is string => typeof x === "string")
      : [];
    return {
      strictVariables: cfg.get<boolean>("strictVariables", false),
      dataModel,
    };
  };

  const warnFile = (folderKey: string, filePath: string, reason: string): void => {
    const msg = `${filePath}: ${reason} (file roots ignored; settings allowlist still applies)`;
    if (lastWarnByFolder.get(folderKey) === msg) {
      return;
    }
    lastWarnByFolder.set(folderKey, msg);
    output.appendLine(`[ftl-data-model] ${msg}`);
  };

  const readDataModelFile = (filePath: string): DataModelFileReadResult => {
    try {
      if (!fs.existsSync(filePath)) {
        return { kind: "missing" };
      }
      const text = fs.readFileSync(filePath, "utf8");
      return { kind: "ok", text };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      return { kind: "unreadable", reason };
    }
  };

  const loadFileRootsForDocument = (
    doc: vscode.TextDocument
  ): readonly string[] => {
    const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
    if (!folder) {
      return [];
    }
    const folderKey = folder.uri.toString();
    const filePath = path.join(folder.uri.fsPath, FTL_DATA_MODEL_FILENAME);
    const model = dataModelCache.getOrLoad(
      folderKey,
      () => readDataModelFile(filePath),
      (reason) => warnFile(folderKey, filePath, reason)
    );
    const rel = path.relative(folder.uri.fsPath, doc.uri.fsPath);
    return rootsForTemplatePath(model, rel);
  };

  const refreshNow = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== "freemarker") {
      return;
    }
    const text = doc.getText();
    const cached = sharedDocCache.get(doc.uri.toString(), doc.version, text);
    const strict = readStrictOptions();
    const fileRoots = loadFileRootsForDocument(doc);
    const dataModel = mergeDataModelAllowlist(strict.dataModel, fileRoots);
    const raw = validateFtl(text, {
      index: cached.index,
      strictVariables: strict.strictVariables,
      dataModel,
      ftldocParams: vscode.workspace
        .getConfiguration("ftl-dev")
        .get<boolean>("ftldoc.validateParams", true),
    });
    const map = buildLineMap(text);
    const diags = raw.map((d) => {
      const pos = diagnosticPositions(text, d, map);
      const range = new vscode.Range(
        pos.line,
        pos.character,
        pos.endLine,
        pos.endCharacter
      );
      const severity =
        d.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : d.severity === "information"
            ? vscode.DiagnosticSeverity.Information
            : vscode.DiagnosticSeverity.Warning;
      return new vscode.Diagnostic(range, d.message, severity);
    });
    collection.set(doc.uri, diags);
  };

  const scheduleRefresh = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== "freemarker") {
      return;
    }
    const key = doc.uri.toString();
    pendingVersion.set(key, doc.version);
    const prev = timers.get(key);
    if (prev) {
      clearTimeout(prev);
    }
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        if (pendingVersion.get(key) !== doc.version) {
          return;
        }
        // Document may have closed or been replaced
        const open = vscode.workspace.textDocuments.find(
          (d) => d.uri.toString() === key
        );
        if (!open || open.version !== doc.version) {
          return;
        }
        refreshNow(open);
      }, DEBOUNCE_MS)
    );
  };

  const refreshVisible = (): void => {
    for (const doc of vscode.workspace.textDocuments) {
      refreshNow(doc);
    }
  };

  const onDataModelFileEvent = (uri: vscode.Uri): void => {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) {
      const key = folder.uri.toString();
      dataModelCache.invalidate(key);
      lastWarnByFolder.delete(key);
    } else {
      // Fallback: match by path basename under known folders
      for (const f of vscode.workspace.workspaceFolders ?? []) {
        const expected = path.join(f.uri.fsPath, FTL_DATA_MODEL_FILENAME);
        if (path.normalize(uri.fsPath) === path.normalize(expected)) {
          dataModelCache.invalidate(f.uri.toString());
          lastWarnByFolder.delete(f.uri.toString());
        }
      }
    }
    refreshVisible();
  };

  let watcherDisposables: vscode.Disposable[] = [];

  const disposeWatchers = (): void => {
    for (const d of watcherDisposables) {
      d.dispose();
    }
    watcherDisposables = [];
  };

  const bindDataModelWatchers = (): void => {
    disposeWatchers();
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const pattern = new vscode.RelativePattern(
        folder,
        FTL_DATA_MODEL_FILENAME
      );
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidCreate(onDataModelFileEvent);
      watcher.onDidChange(onDataModelFileEvent);
      watcher.onDidDelete(onDataModelFileEvent);
      watcherDisposables.push(watcher);
    }
  };

  bindDataModelWatchers();

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refreshNow),
    vscode.workspace.onDidChangeTextDocument((e) => {
      // Do not delete the shared cache here — version miss in `get()` rebuilds.
      // Eager delete forced every provider to re-index on the next keystroke.
      scheduleRefresh(e.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      const key = doc.uri.toString();
      const t = timers.get(key);
      if (t) {
        clearTimeout(t);
        timers.delete(key);
      }
      pendingVersion.delete(key);
      sharedDocCache.delete(key);
      collection.delete(doc.uri);
    }),
    vscode.window.onDidChangeActiveTextEditor((e) => {
      if (e) {
        refreshNow(e.document);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("ftl-dev.strictVariables") ||
        e.affectsConfiguration("ftl-dev.dataModel") ||
        e.affectsConfiguration("ftl-dev.ftldoc.validateParams")
      ) {
        refreshVisible();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      dataModelCache.invalidateAll();
      lastWarnByFolder.clear();
      bindDataModelWatchers();
      refreshVisible();
    }),
    {
      dispose: () => {
        disposeWatchers();
        for (const t of timers.values()) {
          clearTimeout(t);
        }
        timers.clear();
      },
    }
  );

  refreshVisible();
}
