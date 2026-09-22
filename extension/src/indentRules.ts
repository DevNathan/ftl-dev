/**
 * FreeMarker indent policy (shared with language-configuration.json).
 *
 * - Block openers indent the following body.
 * - Mid-block branches (#else / #elseif / #recover / #case / #default) outdent
 *   to the opener column, then indent their own body.
 * - Closing tags outdent to the opener column.
 * - Short #assign / #include / #return / … do not change indent.
 */

/** Directives that always open an indented body. */
export const BLOCK_OPEN =
  "if|list|macro|function|attempt|compress|escape|noescape|autoesc|noautoesc|transform|switch|items";

/** Mid-block lines: same column as opener, body still indented after them. */
export const MID_BLOCK = "else|elseif|recover|case|default";

/** Capture-form assign family (no `=` / `++` / `+=` … in the open tag). */
export const CAPTURE_ASSIGN = "assign|local|global";

/**
 * Line ends a block open → next line should indent.
 * Keep in sync with language-configuration.json indentationRules.increaseIndentPattern
 */
export const INCREASE_INDENT_PATTERN =
  "^\\s*(?:" +
  // #if / #list / … / #else / #elseif / …
  `[\\[<]#(?:${BLOCK_OPEN}|${MID_BLOCK})\\b[^\\]>]*[\\]>]\\s*` +
  "|" +
  // capture <#assign name> / <#assign name in ns>
  `[\\[<]#(?:${CAPTURE_ASSIGN})\\s+(?:[a-zA-Z_][\\w]*|"[^"]+")(?:\\s+in\\s+[^\\]>]+)?\\s*[\\]>]\\s*` +
  "|" +
  // user macro <@name …> not self-closing
  `[\\[<]@[a-zA-Z_][\\w.]*(?:\\s[^\\]>]*)?(?<!/)[\\]>]\\s*` +
  ")$";

/**
 * Line should itself be outdented (close tag or mid-block branch).
 * Keep in sync with language-configuration.json indentationRules.decreaseIndentPattern
 */
export const DECREASE_INDENT_PATTERN =
  "^\\s*(?:" +
  `[\\[<]#(?:${MID_BLOCK})\\b` +
  "|" +
  `[\\[<]/#(?:${BLOCK_OPEN}|${CAPTURE_ASSIGN})\\b` +
  "|" +
  `[\\[<]/@[a-zA-Z_][\\w.]*\\b` +
  ")";

export function lineIncreasesIndent(line: string): boolean {
  return new RegExp(INCREASE_INDENT_PATTERN).test(line);
}

export function lineDecreasesIndent(line: string): boolean {
  return new RegExp(DECREASE_INDENT_PATTERN).test(line);
}
