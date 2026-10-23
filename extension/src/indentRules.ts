/**
 * FreeMarker indent policy (shared with language-configuration.json).
 *
 * - Block openers indent the following body.
 * - Mid-block branches (#else / #elseif / #recover / #case / #on / #default / #sep)
 *   outdent to the opener column, then indent their own body.
 * - Closing tags outdent to the opener column.
 * - Short #assign / #include / #return / … do not change indent.
 *
 * Angle-bracket tags may contain `>` in expressions (`<#if x > 5>`), so open-tag
 * matchers use greedy `.*>` / `.*\\]` rather than `[^>]*`.
 */

/** Directives that always open an indented body. */
export const BLOCK_OPEN =
  "if|list|macro|function|attempt|compress|escape|noescape|noEscape|autoesc|autoEsc|noautoesc|noAutoEsc|transform|switch|items|foreach|forEach|comment";

/** Mid-block lines: same column as opener, body still indented after them. */
export const MID_BLOCK = "else|elseif|elseIf|recover|case|on|default|sep";

/** Capture-form assign family (no `=` / `++` / `+=` … in the open tag). */
export const CAPTURE_ASSIGN = "assign|local|global";

/**
 * Line ends a block open → next line should indent.
 * Keep in sync with language-configuration.json indentationRules.increaseIndentPattern
 */
export const INCREASE_INDENT_PATTERN =
  "^\\s*(?:" +
  // #if / #list / … / #else / #elseif / … (angle: last `>` on the line)
  `<#(?:${BLOCK_OPEN}|${MID_BLOCK})\\b.*>\\s*` +
  "|" +
  // square-bracket form
  `\\[#(?:${BLOCK_OPEN}|${MID_BLOCK})\\b.*\\]\\s*` +
  "|" +
  // capture <#assign> / <#assign name> / <#assign name in ns>
  `<#(?:${CAPTURE_ASSIGN})(?:\\s+(?:[a-zA-Z_][\\w]*|"[^"]+")(?:\\s+in\\s+[^>]*)?)?>\\s*` +
  "|" +
  `\\[#(?:${CAPTURE_ASSIGN})(?:\\s+(?:[a-zA-Z_][\\w]*|"[^"]+")(?:\\s+in\\s+[^\\]]*)?)?\\]\\s*` +
  "|" +
  // user macro <@name …> not self-closing (`/>` / `/]`)
  `<@[a-zA-Z_][\\w.]*(?!.*\\/\\s*>)(?:\\s[^>]*)?>\\s*` +
  "|" +
  `\\[@[a-zA-Z_][\\w.]*(?!.*\\/\\s*\\])(?:\\s[^\\]]*)?\\]\\s*` +
  ")$";

/**
 * Line should itself be outdented (close tag or mid-block branch).
 * Keep in sync with language-configuration.json indentationRules.decreaseIndentPattern
 *
 * Intentionally does **not** require a closing `>` / `]` so outdent can start as soon
 * as the directive name is recognizable while typing.
 */
export const DECREASE_INDENT_PATTERN =
  "^\\s*(?:" +
  `[\\[<]#(?:${MID_BLOCK})\\b` +
  "|" +
  `[\\[<]/#(?:${BLOCK_OPEN}|${CAPTURE_ASSIGN})\\b` +
  "|" +
  `[\\[<]/@[a-zA-Z_][\\w.]*\\b` +
  ")";

const INCREASE_INDENT_RE = new RegExp(INCREASE_INDENT_PATTERN);
const DECREASE_INDENT_RE = new RegExp(DECREASE_INDENT_PATTERN);

export function lineIncreasesIndent(line: string): boolean {
  return INCREASE_INDENT_RE.test(line);
}

export function lineDecreasesIndent(line: string): boolean {
  return DECREASE_INDENT_RE.test(line);
}
