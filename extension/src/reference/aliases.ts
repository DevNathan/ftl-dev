/**
 * camelCase ↔ snake_case aliases, generated from FreeMarker 2.3.35 sources
 * (`BuiltIn.putBI`, `_CoreAPI` directive names, `BuiltinVariable` `_CC` names).
 */

/** camelCase built-in name → canonical snake_case name. */
export const BUILTIN_CAMEL_ALIASES: Readonly<Record<string, string>> = {
  absoluteTemplateName: "absolute_template_name",
  blankToNull: "blank_to_null",
  cLowerCase: "c_lower_case",
  cUpperCase: "c_upper_case",
  capFirst: "cap_first",
  chopLinebreak: "chop_linebreak",
  dateIfUnknown: "date_if_unknown",
  datetimeIfUnknown: "datetime_if_unknown",
  dropWhile: "drop_while",
  emptyToNull: "empty_to_null",
  endsWith: "ends_with",
  ensureEndsWith: "ensure_ends_with",
  ensureStartsWith: "ensure_starts_with",
  evalJson: "eval_json",
  hasApi: "has_api",
  hasContent: "has_content",
  hasNext: "has_next",
  ifExists: "if_exists",
  indexOf: "index_of",
  isBoolean: "is_boolean",
  isCollection: "is_collection",
  isCollectionEx: "is_collection_ex",
  isDate: "is_date",
  isDateLike: "is_date_like",
  isDateOnly: "is_date_only",
  isDatetime: "is_datetime",
  isDirective: "is_directive",
  isEnumerable: "is_enumerable",
  isEvenItem: "is_even_item",
  isFirst: "is_first",
  isHash: "is_hash",
  isHashEx: "is_hash_ex",
  isIndexable: "is_indexable",
  isInfinite: "is_infinite",
  isLast: "is_last",
  isMacro: "is_macro",
  isMarkupOutput: "is_markup_output",
  isMethod: "is_method",
  isNan: "is_nan",
  isNode: "is_node",
  isNumber: "is_number",
  isOddItem: "is_odd_item",
  isSequence: "is_sequence",
  isString: "is_string",
  isTime: "is_time",
  isTransform: "is_transform",
  isUnknownDateLike: "is_unknown_date_like",
  isoH: "iso_h",
  isoHNZ: "iso_h_nz",
  isoLocal: "iso_local",
  isoLocalH: "iso_local_h",
  isoLocalHNZ: "iso_local_h_nz",
  isoLocalM: "iso_local_m",
  isoLocalMNZ: "iso_local_m_nz",
  isoLocalMs: "iso_local_ms",
  isoLocalMsNZ: "iso_local_ms_nz",
  isoLocalNZ: "iso_local_nz",
  isoM: "iso_m",
  isoMNZ: "iso_m_nz",
  isoMs: "iso_ms",
  isoMsNZ: "iso_ms_nz",
  isoNZ: "iso_nz",
  isoUtc: "iso_utc",
  isoUtcFZ: "iso_utc_fz",
  isoUtcH: "iso_utc_h",
  isoUtcHNZ: "iso_utc_h_nz",
  isoUtcM: "iso_utc_m",
  isoUtcMNZ: "iso_utc_m_nz",
  isoUtcMs: "iso_utc_ms",
  isoUtcMsNZ: "iso_utc_ms_nz",
  isoUtcNZ: "iso_utc_nz",
  itemCycle: "item_cycle",
  itemParity: "item_parity",
  itemParityCap: "item_parity_cap",
  jString: "j_string",
  jsString: "js_string",
  jsonString: "json_string",
  keepAfter: "keep_after",
  keepAfterLast: "keep_after_last",
  keepBefore: "keep_before",
  keepBeforeLast: "keep_before_last",
  lastIndexOf: "last_index_of",
  leftPad: "left_pad",
  lowerAbc: "lower_abc",
  lowerCase: "lower_case",
  markupString: "markup_string",
  nextSibling: "next_sibling",
  noEsc: "no_esc",
  nodeName: "node_name",
  nodeNamespace: "node_namespace",
  nodeType: "node_type",
  numberToDate: "number_to_date",
  numberToDatetime: "number_to_datetime",
  numberToTime: "number_to_time",
  previousSibling: "previous_sibling",
  removeBeginning: "remove_beginning",
  removeEnding: "remove_ending",
  rightPad: "right_pad",
  seqContains: "seq_contains",
  seqIndexOf: "seq_index_of",
  seqLastIndexOf: "seq_last_index_of",
  sortBy: "sort_by",
  startsWith: "starts_with",
  takeWhile: "take_while",
  timeIfUnknown: "time_if_unknown",
  trimToNull: "trim_to_null",
  truncateC: "truncate_c",
  truncateCM: "truncate_c_m",
  truncateM: "truncate_m",
  truncateW: "truncate_w",
  truncateWM: "truncate_w_m",
  uncapFirst: "uncap_first",
  upperAbc: "upper_abc",
  upperCase: "upper_case",
  urlPath: "url_path",
  webSafe: "web_safe",
  wordList: "word_list",
};

/** camelCase directive name → canonical lower-case name. */
export const DIRECTIVE_CAMEL_ALIASES: Readonly<Record<string, string>> = {
  autoEsc: "autoesc",
  elseIf: "elseif",
  forEach: "foreach",
  noAutoEsc: "noautoesc",
  noEscape: "noescape",
  noParse: "noparse",
  outputFormat: "outputformat",
};

/** Deprecated directives FreeMarker still accepts (not offered in completion). */
export const LEGACY_DIRECTIVES: Readonly<Record<string, string>> = {
  call: "'#call' is deprecated; call the macro with <@name …> instead.",
  comment: "'#comment' is deprecated; use an FTL comment <#-- … --> instead.",
  foreach: "'#foreach' is deprecated; use <#list seq as x> instead.",
};

/** Canonical built-in name (`upperCase` → `upper_case`). */
export function canonicalBuiltin(name: string): string {
  return BUILTIN_CAMEL_ALIASES[name] ?? name;
}

/** Canonical directive name (`noParse` → `noparse`). */
export function canonicalDirective(name: string): string {
  return DIRECTIVE_CAMEL_ALIASES[name] ?? name;
}

/** Canonical special variable name (`dataModel` → `data_model`). */
export function canonicalSpecialVar(name: string): string {
  return /[A-Z]/.test(name)
    ? name.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)
    : name;
}
