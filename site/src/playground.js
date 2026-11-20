import { basicSetup } from "codemirror";
import { Compartment, EditorState, StateEffect } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, activateHover, closeHoverTooltips, hasHoverTooltips, hoverTooltip, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { autocompletion, snippetCompletion } from "@codemirror/autocomplete";
import { linter } from "@codemirror/lint";
import MarkdownIt from "markdown-it";
import { analyze, completionsAt, definitionAt, hoverAt } from "./playground-language";

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const words = {
  en: {
    noProblems: "No diagnostics", editing: "Editing", line: "Line", column: "Column",
    limit: "Analysis is paused above 30,000 characters. Download the file to continue in your editor.",
    error: "Could not load the editor. Reload this page to try again.",
    language: "FreeMarker example code",
    problemSummary: (count) => `${count} diagnostic${count === 1 ? "" : "s"}`,
    coloringLoading: "Loading syntax colors…",
    coloringError: "Syntax colors could not load. Editing and diagnostics are available.",
  },
  ko: {
    noProblems: "진단 없음", editing: "수정 중", line: "줄", column: "열",
    limit: "30,000자를 넘으면 분석을 잠시 멈춥니다. 파일을 내려받아 에디터에서 이어서 편집하세요.",
    error: "편집기를 불러오지 못했습니다. 페이지를 새로 고쳐 주세요.",
    language: "FreeMarker 예제 코드",
    problemSummary: (count) => `진단 ${count}개`,
    coloringLoading: "문법 색상 불러오는 중…",
    coloringError: "문법 색상을 불러오지 못했습니다. 편집과 진단은 사용할 수 있습니다.",
  },
};
function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ }
}
function label(key) { return words[root.dataset.lang]?.[key] ?? words.en[key]; }

let view;
let active;
let originals;
let files;
const states = new Map();
const lintConfig = new Compartment();
const themeConfig = new Compartment();
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const refreshHighlight = StateEffect.define();
let coloringState = "coloringLoading";
let highlight = () => [];
let focusDocumentation = false;
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });

function docElement(text) {
  const dom = document.createElement("div");
  dom.className = "ftl-doc";
  dom.lang = "en";
  // markdown-it escapes HTML and rejects unsafe URL protocols.
  dom.innerHTML = markdown.render(text);
  for (const link of dom.querySelectorAll("a")) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  return dom;
}

function currentData(editor) {
  files.set(active, editor.state.doc.toString());
  return analyze(active, files, $("strict").checked);
}

function updateStatus() {
  if (!view) return;
  const text = view.state.doc.toString();
  const cursor = view.state.selection.main.head;
  const line = view.state.doc.lineAt(cursor);
  $("file-status").textContent = active + (text !== originals.get(active) ? " · " + label("editing") : "");
  $("cursor-status").textContent = label("line") + " " + line.number + ", " + label("column") + " " + (cursor - line.from + 1);
  $("highlight-status").textContent = coloringState ? label(coloringState) : "";
}

function updateProblems(editor) {
  const text = editor.state.doc.toString();
  const paused = text.length > 30000;
  const issues = paused ? [] : currentData(editor).diagnostics;
  $("problem-count").textContent = paused ? "—" : String(issues.length);
  const summary = paused ? label("limit") : issues.length ? label("problemSummary")(issues.length) : label("noProblems");
  if ($("analysis-status").textContent !== summary) $("analysis-status").textContent = summary;
  const list = $("problem-list");
  list.replaceChildren();
  for (const issue of issues) {
    const from = Math.min(issue.offset, text.length);
    const line = editor.state.doc.lineAt(from);
    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "problem-link " + issue.severity;
    button.lang = "en";
    button.textContent = ({ error: "Error", warning: "Warning", information: "Info" })[issue.severity] + ": " + issue.message;
    const position = document.createElement("span");
    position.className = "problem-location";
    position.lang = root.dataset.lang;
    position.textContent = label("line") + " " + line.number + ", " + label("column") + " " + (from - line.from + 1);
    button.append(position);
    button.addEventListener("click", () => {
      view.dispatch({ selection: { anchor: from }, scrollIntoView: true });
      view.focus();
    });
    row.append(button);
    list.append(row);
  }
  return issues.map((issue) => ({
    from: Math.min(issue.offset, text.length),
    to: Math.min(issue.offset + issue.length, text.length),
    severity: issue.severity === "information" ? "info" : issue.severity,
    message: issue.message,
  }));
}

function diagnostics() { return linter(updateProblems, { delay: 200 }); }

function goToDefinition(editor, offset = editor.state.selection.main.head) {
  if (editor.state.doc.length > 30000) return false;
  const target = definitionAt(currentData(editor), active, files, offset);
  if (!target) return false;
  openFile(target.file);
  view.dispatch({ selection: { anchor: target.offset }, scrollIntoView: true });
  view.focus();
  return true;
}

function darkTheme() {
  return root.dataset.theme ? root.dataset.theme === "dark" : systemTheme.matches;
}

function editorTheme() {
  return EditorView.theme({
    "&": { color: "var(--fg)", backgroundColor: "var(--panel)" },
    ".cm-content": { padding: "14px 0", caretColor: "var(--fg)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fg)" },
    ".cm-gutters": { backgroundColor: "var(--panel)", color: "var(--muted)", border: "none" },
    // Selection is drawn behind the text, so the line fill must be translucent.
    ".cm-activeLine": { backgroundColor: "var(--active-line)" },
    ".cm-activeLineGutter": { backgroundColor: "var(--soft)" },
    ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": { backgroundColor: "var(--selection)" },
    ".cm-tooltip": { backgroundColor: "var(--tip)", color: "var(--fg)", border: "1px solid var(--line)", borderRadius: "8px" },
    // Completion documentation is positioned outside the list's bounds.
    ".cm-tooltip-autocomplete": { overflow: "visible" },
    ".cm-tooltip-autocomplete > ul": { fontFamily: "inherit" },
    ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--selection)", color: "var(--fg)" },
  }, { dark: darkTheme() });
}

function syncEditorTheme() {
  if (view && view.state.facet(EditorView.darkTheme) !== darkTheme()) {
    view.dispatch({ effects: themeConfig.reconfigure(editorTheme()) });
  }
}

function makeState(text, syntax) {
  return EditorState.create({
    doc: text,
    extensions: [
      basicSetup,
      syntax,
      lintConfig.of(diagnostics()),
      EditorState.tabSize.of(2),
      EditorView.contentAttributes.of({ "aria-label": label("language"), "aria-describedby": "editor-help-" + root.dataset.lang, spellcheck: "false" }),
      themeConfig.of(editorTheme()),
      keymap.of([indentWithTab, { key: "F12", run: goToDefinition }, {
        key: "F1", run: (editor) => {
          focusDocumentation = true;
          activateHover(editor, editor.state.selection.main.head, 1, { until: (tr) => tr.docChanged || tr.selection !== undefined });
          focusDocumentation = false;
          return true;
        },
      }, {
        key: "Escape", run: (editor) => {
          if (!hasHoverTooltips(editor.state)) return false;
          editor.dispatch({ effects: closeHoverTooltips });
          return true;
        },
      }]),
      EditorView.domEventHandlers({
        click(event, editor) {
          if (!event.ctrlKey && !event.metaKey) return false;
          const offset = editor.posAtCoords({ x: event.clientX, y: event.clientY });
          return offset !== null && goToDefinition(editor, offset);
        },
      }),
      autocompletion({
        override: [(context) => {
          if (context.state.doc.length > 30000) return null;
          const result = completionsAt(currentData(view), context.pos, context.explicit);
          if (!result) return null;
          return {
            from: result.from,
            options: result.items.map((item) => {
              const entry = {
                label: item.label,
                type: item.kind === "builtin" ? "function" : item.kind === "directive" ? "keyword" : "variable",
                detail: item.detail,
                info: item.documentation ? () => docElement(item.documentation) : undefined,
              };
              return item.insertAsSnippet
                ? snippetCompletion((item.insertText ?? item.label).replaceAll("$0", "${}"), entry)
                : { ...entry, apply: item.insertText ?? item.label };
            }),
          };
        }],
      }),
      hoverTooltip((editor, pos) => {
        if (editor.state.doc.length > 30000) return null;
        const help = hoverAt(currentData(editor), active, files, pos);
        const keyboard = focusDocumentation;
        return help ? {
          pos: help.start, end: help.end, above: true,
          create: () => {
            const dom = docElement(help.markdown);
            if (keyboard) {
              dom.tabIndex = -1;
              dom.addEventListener("keydown", (event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                editor.dispatch({ effects: closeHoverTooltips });
                editor.focus();
              });
              dom.addEventListener("focusout", (event) => {
                if (event.relatedTarget && !dom.contains(event.relatedTarget)) editor.dispatch({ effects: closeHoverTooltips });
              });
            }
            return { dom, mount: () => { if (keyboard) dom.focus({ preventScroll: true }); } };
          },
        } : null;
      }, { hoverTime: 250 }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) files.set(active, update.state.doc.toString());
        updateStatus();
      }),
    ],
  });
}

let syntax;
function openFile(file) {
  if (!files.has(file)) return;
  if (view) {
    files.set(active, view.state.doc.toString());
    states.set(active, view.state);
  }
  active = file;
  const state = states.get(file) ?? makeState(files.get(file), syntax);
  if (view) view.setState(state);
  else {
    $("editor").replaceChildren();
    view = new EditorView({ parent: $("editor"), state });
  }
  $("sample").value = file;
  syncEditorTheme();
  view.contentDOM.setAttribute("aria-label", label("language"));
  view.contentDOM.setAttribute("aria-describedby", "editor-help-" + root.dataset.lang);
  const url = new URL(location.href);
  url.searchParams.set("file", file);
  history.replaceState(null, "", url);
  updateStatus();
  updateProblems(view);
}

async function start() {
  const response = await fetch(new URL("./playground-samples.json", import.meta.url));
  if (!response.ok) throw new Error("Examples could not be loaded");
  const samples = await response.json();
  originals = new Map(Object.entries(samples));
  files = new Map(originals);
  syntax = ViewPlugin.fromClass(class {
    constructor(editor) { this.decorations = this.highlight(editor); }
    update(update) {
      if (update.docChanged || update.transactions.some((tr) => tr.effects.some((effect) => effect.is(refreshHighlight)))) {
        this.decorations = this.highlight(update.view);
      }
    }
    highlight(editor) {
      const marks = highlight(editor.state.doc.toString()).map((token) =>
        Decoration.mark({
          class: "ftl-token",
          attributes: { style: token.style },
        }).range(token.from, token.to));
      return Decoration.set(marks, true);
    }
  }, { decorations: (plugin) => plugin.decorations });

  $("sample").replaceChildren();
  for (const file of files.keys()) {
    const option = document.createElement("option");
    option.value = file;
    option.textContent = file;
    $("sample").append(option);
  }
  const requested = new URL(location.href).searchParams.get("file");
  openFile(files.has(requested) ? requested : "hero.ftl");
  for (const id of ["sample", "reset", "download"]) $(id).disabled = false;
  $("sample").addEventListener("change", (event) => openFile(event.target.value));
  $("reset").addEventListener("click", () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: originals.get(active) } });
  });
  $("download").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([view.state.doc.toString()], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = active.split("/").at(-1);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("strict").addEventListener("change", () => {
    view.dispatch({ effects: lintConfig.reconfigure(diagnostics()) });
    updateProblems(view);
  });
  // Editing and diagnostics work while the larger grammar/WASM chunk loads.
  import("./playground-highlight.js").then(({ createTokenHighlighter }) => createTokenHighlighter()).then((tokenize) => {
    highlight = tokenize;
    coloringState = "";
    view.dispatch({ effects: refreshHighlight.of(null) });
    updateStatus();
  }).catch((error) => {
    console.error(error);
    coloringState = "coloringError";
    updateStatus();
  });
}

$("lang-toggle").addEventListener("click", () => {
  root.dataset.lang = root.dataset.lang === "ko" ? "en" : "ko";
  root.lang = root.dataset.lang;
  save("ftl-dev-lang", root.dataset.lang);
  updateStatus();
  if (view) {
    view.contentDOM.setAttribute("aria-label", label("language"));
    view.contentDOM.setAttribute("aria-describedby", "editor-help-" + root.dataset.lang);
    updateProblems(view);
  }
});
$("theme-toggle").addEventListener("click", () => {
  root.dataset.theme = darkTheme() ? "light" : "dark";
  save("ftl-dev-theme", root.dataset.theme);
  syncEditorTheme();
});
systemTheme.addEventListener("change", () => {
  if (!root.dataset.theme) syncEditorTheme();
});

start().catch((error) => {
  console.error(error);
  const status = $("load-status");
  if (status) status.textContent = label("error");
});
