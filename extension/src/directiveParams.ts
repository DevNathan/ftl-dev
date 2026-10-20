/**
 * Built-in FreeMarker directive named parameters and fixed clause keywords.
 * Snake_case is the source of truth; camelCase aliases (2.3.23+) are derived
 * for completion and TextMate `#directive-named-param` sync.
 * Keep TextMate attribute-name alternation in freemarker.tmLanguage.json in sync
 * (snake ∪ distinct camel).
 */

/** True `name=value` parameters keyed by directive name (Apache synopsis order). */
export const DIRECTIVE_NAMED_PARAMS: Readonly<
  Record<string, readonly string[]>
> = {
  ftl: [
    "encoding",
    "strip_whitespace",
    "strip_text",
    "strict_syntax",
    "attributes",
    "ns_prefixes",
    "auto_esc",
    "output_format",
  ],
  setting: [
    "locale",
    "number_format",
    "boolean_format",
    "date_format",
    "time_format",
    "datetime_format",
    "time_zone",
    "sql_date_and_time_time_zone",
    "c_format",
    "url_escaping_charset",
    "output_encoding",
    "classic_compatible",
  ],
  include: ["parse", "encoding", "ignore_missing"],
};

/** Fixed keyword clauses (`as` / `in` / `using`) keyed by directive name. */
export const DIRECTIVE_CLAUSE_KEYWORDS: Readonly<
  Record<string, readonly string[]>
> = {
  list: ["as"],
  items: ["as"],
  import: ["as"],
  escape: ["as"],
  assign: ["in"],
  local: ["in"],
  global: ["in"],
  visit: ["using"],
  recurse: ["using"],
};

/**
 * Snake_case boolean-like named params (Apache boolean constants / expr→boolean).
 * Both snake and derived camel forms are accepted by `isBooleanDirectiveParam`.
 */
const BOOLEAN_NAMED_PARAMS_SNAKE: Readonly<
  Record<string, readonly string[]>
> = {
  ftl: ["strip_whitespace", "strip_text", "strict_syntax", "auto_esc"],
  setting: ["classic_compatible"],
  include: ["parse", "ignore_missing"],
};

/** Split on `_`, keep first segment, Capitalize subsequent segments. */
export function snakeToCamel(name: string): string {
  const parts = name.split("_");
  if (parts.length <= 1) {
    return name;
  }
  return (
    parts[0]! +
    parts
      .slice(1)
      .map((p) => (p.length === 0 ? "" : p[0]!.toUpperCase() + p.slice(1)))
      .join("")
  );
}

/** Named params for a directive: snake ∪ distinct camel, snake-first, deduped. */
export function namedParamsWithAliases(directive: string): readonly string[] {
  const named = DIRECTIVE_NAMED_PARAMS[directive] ?? [];
  if (named.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of named) {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
    const camel = snakeToCamel(n);
    if (!seen.has(camel)) {
      seen.add(camel);
      out.push(camel);
    }
  }
  return out;
}

/** Named params (with aliases) ∪ clause keywords for a directive, deduped. */
export function paramsForDirective(name: string): readonly string[] {
  const named = namedParamsWithAliases(name);
  const clause = DIRECTIVE_CLAUSE_KEYWORDS[name] ?? [];
  if (named.length === 0 && clause.length === 0) {
    return [];
  }
  if (clause.length === 0) {
    return named;
  }
  if (named.length === 0) {
    return clause;
  }
  const seen = new Set<string>(named);
  const out = [...named];
  for (const k of clause) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

export function hasDirectiveParamCatalog(name: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(DIRECTIVE_NAMED_PARAMS, name) ||
    Object.prototype.hasOwnProperty.call(DIRECTIVE_CLAUSE_KEYWORDS, name)
  );
}

/** True when `paramName` (snake or camel) is a boolean-like named param. */
export function isBooleanDirectiveParam(
  directive: string,
  paramName: string
): boolean {
  const snakes = BOOLEAN_NAMED_PARAMS_SNAKE[directive];
  if (!snakes) {
    return false;
  }
  for (const s of snakes) {
    if (paramName === s || paramName === snakeToCamel(s)) {
      return true;
    }
  }
  return false;
}

/** Static value suggestions for a named-param value slot (not exhaustive). */
export type DirectiveParamValueCatalog = {
  values: readonly string[];
  detail: string;
};

const BOOLEAN_VALUES = ["true", "false"] as const;

/** Practical locale ids — small fixed list, not a full CLDR dump. */
export const LOCALE_VALUE_CATALOG = [
  "en_US",
  "en_GB",
  "de_DE",
  "fr_FR",
  "es_ES",
  "it_IT",
  "ja_JP",
  "zh_CN",
  "zh_TW",
  "ko_KR",
  "pt_BR",
  "ru_RU",
] as const;

/** Common charset names for encoding / *_charset / output_encoding. */
export const CHARSET_VALUE_CATALOG = [
  "UTF-8",
  "UTF-16",
  "UTF-16BE",
  "UTF-16LE",
  "ISO-8859-1",
  "US-ASCII",
  "Windows-1252",
  "Shift_JIS",
  "EUC-KR",
  "GBK",
] as const;

/** Common number/date/time/boolean/?c format patterns and style names. */
export const FORMAT_VALUE_CATALOG = [
  "#,##0",
  "#,##0.00",
  "0.##",
  "0.00",
  "yyyy-MM-dd",
  "HH:mm:ss",
  "yyyy-MM-dd HH:mm:ss",
  "short",
  "medium",
  "long",
  "full",
  "true,false",
  "c",
  "computer",
] as const;

/** Built-in FreeMarker output format names (practical subset). */
export const OUTPUT_FORMAT_VALUE_CATALOG = [
  "HTML",
  "XHTML",
  "XML",
  "RTF",
  "plainText",
  "CSS",
  "JavaScript",
  "JSON",
] as const;

const CHARSET_PARAMS = new Set([
  "encoding",
  "url_escaping_charset",
  "output_encoding",
]);

const FORMAT_PARAMS = new Set([
  "number_format",
  "boolean_format",
  "date_format",
  "time_format",
  "datetime_format",
  "c_format",
]);

/**
 * Static value catalog for a named param after `=` (snake or camel).
 * Booleans, locales, charsets, format patterns, and output_format only.
 */
export function directiveParamValueCatalog(
  directive: string,
  paramName: string
): DirectiveParamValueCatalog | undefined {
  if (isBooleanDirectiveParam(directive, paramName)) {
    return { values: BOOLEAN_VALUES, detail: "boolean" };
  }
  const snake = camelToSnakeParam(paramName) ?? paramName;
  // Only offer catalogs for params that exist on this directive.
  const named = DIRECTIVE_NAMED_PARAMS[directive];
  if (!named || !named.includes(snake)) {
    return undefined;
  }
  if (snake === "locale") {
    return { values: LOCALE_VALUE_CATALOG, detail: "locale" };
  }
  if (CHARSET_PARAMS.has(snake)) {
    return { values: CHARSET_VALUE_CATALOG, detail: "charset" };
  }
  if (FORMAT_PARAMS.has(snake)) {
    return { values: FORMAT_VALUE_CATALOG, detail: "format" };
  }
  if (snake === "output_format") {
    return { values: OUTPUT_FORMAT_VALUE_CATALOG, detail: "output format" };
  }
  return undefined;
}

/**
 * One-liner docs for named params (snake keys) and optional clause keywords.
 * Completions look up via `paramDocumentation` (camel → snake normalize).
 */
export const DIRECTIVE_PARAM_DOCS: Readonly<Record<string, string>> = {
  // #ftl
  encoding: "Template file encoding (charset name).",
  strip_whitespace: "Strip whitespace around FTL tags when true.",
  strip_text: "Strip text between FTL tags when true.",
  strict_syntax: "Require #/[@] syntax (legacy strict mode).",
  attributes: "Custom attributes hash for the template.",
  ns_prefixes: "Namespace prefix → URI hash for XML namespaces.",
  auto_esc: "Enable auto-escaping for the template output.",
  output_format: "Output format name (e.g. HTML, XML, plainText).",
  // #setting
  locale: "Default locale for number/date formatting.",
  number_format: "Default number format pattern.",
  boolean_format: "Default boolean format (true/false strings).",
  date_format: "Default date format pattern.",
  time_format: "Default time format pattern.",
  datetime_format: "Default date-time format pattern.",
  time_zone: "Default time zone for date/time values.",
  sql_date_and_time_time_zone: "Time zone for SQL date/time values.",
  c_format: "Format used by the ?c built-in.",
  url_escaping_charset: "Charset for URL escaping.",
  output_encoding: "Charset of the template output stream.",
  classic_compatible: "Enable FreeMarker classic compatibility quirks.",
  // #include
  parse: "Parse the included file as FTL when true.",
  ignore_missing: "If true, missing include path is silent.",
  // Clause keywords
  as: "Bind each iterated item to this variable name.",
  in: "Assign into a named namespace hash.",
  using: "Namespace used while visiting/recursing nodes.",
};

/** All snake named-param names across ftl/setting/include (deduped). */
const ALL_NAMED_PARAM_SNAKES: readonly string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of Object.values(DIRECTIVE_NAMED_PARAMS)) {
    for (const s of list) {
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  }
  return out;
})();

/**
 * Normalize a completion/usage name to its snake catalog key.
 * Returns the name if it is already a catalog snake; else the snake whose
 * camel form equals `name`; else undefined.
 */
export function camelToSnakeParam(name: string): string | undefined {
  if (ALL_NAMED_PARAM_SNAKES.includes(name)) {
    return name;
  }
  for (const snake of ALL_NAMED_PARAM_SNAKES) {
    if (snakeToCamel(snake) === name) {
      return snake;
    }
  }
  return undefined;
}

/** One-liner for a named param or clause keyword (camel or snake). */
export function paramDocumentation(name: string): string | undefined {
  const snake = camelToSnakeParam(name);
  return DIRECTIVE_PARAM_DOCS[snake ?? name];
}
