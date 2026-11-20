import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import wasm from "shiki/wasm";
import html from "@shikijs/langs/html";
import sql from "@shikijs/langs/sql";
import { codeThemes } from "./code-themes";
import grammar from "../../extension/syntaxes/freemarker.tmLanguage.json";

export async function createTokenHighlighter() {
  const highlighter = await createHighlighterCore({
    themes: codeThemes,
    langs: [html, sql, { ...grammar, name: "freemarker" }],
    engine: createOnigurumaEngine(wasm),
  });
  return (text) => {
    if (text.length > 30000 || text.split("\n").some((line) => line.length > 2000)) return [];
    const { tokens } = highlighter.codeToTokens(text, {
      lang: "freemarker", themes: { light: "github-light", dark: "github-dark" }, defaultColor: false,
    });
    return tokens.flat().filter((token) => token.content.length).map((token) => ({
      from: token.offset,
      to: token.offset + token.content.length,
      style: Object.entries(token.htmlStyle).map(([property, value]) => `${property}:${value}`).join(";"),
    }));
  };
}
