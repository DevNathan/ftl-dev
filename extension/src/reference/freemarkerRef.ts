/**
 * Concise FreeMarker reference for completions / hover.
 * Descriptions are paraphrased from the Apache FreeMarker Manual
 * (https://freemarker.apache.org/docs/) — Apache License 2.0.
 */
import {
  canonicalBuiltin,
  canonicalDirective,
  canonicalSpecialVar,
} from "./aliases";

export type RefDoc = {
  /** Short one-liner for CompletionItem.detail */
  detail: string;
  /** Markdown body for documentation / hover */
  documentation: string;
};

const MANUAL = "https://freemarker.apache.org/docs";

function builtinDoc(
  name: string,
  detail: string,
  body: string,
  page: string,
  usage?: string
): RefDoc {
  const usageLine = usage ?? `value?${name}`;
  return {
    detail,
    documentation: [
      `**\`?${name}\`** — ${detail}`,
      "",
      "```ftl",
      usageLine,
      "```",
      "",
      body,
      "",
      `[FreeMarker Manual](${MANUAL}/${page})`,
    ].join("\n"),
  };
}

function directiveDoc(
  name: string,
  detail: string,
  body: string,
  page: string,
  usage?: string
): RefDoc {
  const usageLine = usage ?? `<#${name} …>`;
  return {
    detail,
    documentation: [
      `**\`#${name}\`** — ${detail}`,
      "",
      "```ftl",
      usageLine,
      "```",
      "",
      body,
      "",
      `[FreeMarker Manual](${MANUAL}/${page})`,
    ].join("\n"),
  };
}

/** Built-in (`?name`) documentation keyed by name. */
export const BUILTIN_REF: Record<string, RefDoc> = {
  abs: builtinDoc(
    "abs",
    "Absolute value of a number.",
    "Returns the absolute value of a number.",
    "ref_builtins_number.html",
    "n?abs"
  ),
  api: builtinDoc(
    "api",
    "Access the underlying Java API of a value (rarely needed).",
    "Exposes Java methods/properties when the FTL view hides them. Prefer normal built-ins (e.g. `?size`) when possible. Requires `api_builtin_enabled` and a supporting object wrapper.",
    "ref_builtins_expert.html",
    "value?api.someMethod()"
  ),
  boolean: builtinDoc(
    "boolean",
    "Convert to boolean.",
    "Converts the value to a boolean (e.g. from string/number according to FreeMarker conversion rules).",
    "ref_builtins_boolean.html",
    's?boolean'
  ),
  byte: builtinDoc(
    "byte",
    "Number as java.lang.Byte.",
    "Returns the same numeric value using `Byte` as the internal type (overload / unwrapping cases).",
    "ref_builtins_expert.html",
    "n?byte"
  ),
  c: builtinDoc(
    "c",
    "Computer-language (JSON-like) formatting.",
    "Formats for machine-readable output (numbers/booleans/strings) rather than locale-sensitive display. Useful when generating source/config text.",
    "ref_builtins_string.html",
    "${n?c}"
  ),
  cap_first: builtinDoc(
    "cap_first",
    "Capitalize the first character.",
    "Returns the string with the first character converted to upper case.",
    "ref_builtins_string.html",
    '"hello"?cap_first'
  ),
  capitalize: builtinDoc(
    "capitalize",
    "Capitalize words in a string.",
    "Returns the string with the first letter of each word in upper case.",
    "ref_builtins_string.html",
    '"hello world"?capitalize'
  ),
  ceiling: builtinDoc(
    "ceiling",
    "Round toward +∞.",
    "Returns the nearest integer that is not smaller than the number (ceiling).",
    "ref_builtins_number.html",
    "n?ceiling"
  ),
  children: builtinDoc(
    "children",
    "Child nodes of an XML node.",
    "For XML/node values, returns the sequence of child nodes.",
    "ref_builtins_node.html",
    "node?children"
  ),
  chop_linebreak: builtinDoc(
    "chop_linebreak",
    "Remove a trailing line break.",
    "If the string ends with a line break, removes that line break.",
    "ref_builtins_string.html",
    "s?chop_linebreak"
  ),
  contains: builtinDoc(
    "contains",
    "Test whether a string/sequence contains a value.",
    "For strings: whether a substring occurs. For sequences: whether an element equals the argument.",
    "ref_builtins_string.html",
    's?contains("x")'
  ),
  date: builtinDoc(
    "date",
    "Date-only value / convert to date.",
    "Used with date/time values or conversion to a date (see manual for forms and formats).",
    "ref_builtins_date.html",
    "d?date"
  ),
  datetime: builtinDoc(
    "datetime",
    "Date-time value / convert to date-time.",
    "Used with date-time values or conversion (see manual for formats).",
    "ref_builtins_date.html",
    "d?datetime"
  ),
  default: builtinDoc(
    "default",
    "Fallback when the left value is missing/null.",
    "Often written with the `!` default operator as well. `expr?default(fallback)` supplies a value when `expr` is missing.",
    "ref_builtins_expert.html",
    "x?default(\"n/a\")"
  ),
  double: builtinDoc(
    "double",
    "Number as java.lang.Double.",
    "Same numeric value with `Double` internal representation.",
    "ref_builtins_expert.html",
    "n?double"
  ),
  ends_with: builtinDoc(
    "ends_with",
    "Test string suffix.",
    "Returns whether the string ends with the given substring.",
    "ref_builtins_string.html",
    's?ends_with(".ftl")'
  ),
  ensure_ends_with: builtinDoc(
    "ensure_ends_with",
    "Append suffix if missing.",
    "Returns the string, appending the argument if it does not already end with it.",
    "ref_builtins_string.html",
    's?ensure_ends_with("/")'
  ),
  ensure_starts_with: builtinDoc(
    "ensure_starts_with",
    "Prepend prefix if missing.",
    "Returns the string, prepending the argument if it does not already start with it.",
    "ref_builtins_string.html",
    's?ensure_starts_with("/")'
  ),
  esc: builtinDoc(
    "esc",
    "Escape according to the current output format.",
    "Escapes the string for the active output format (HTML/XML/…). Prefer automatic escaping when configured.",
    "ref_builtins_string.html",
    "s?esc"
  ),
  eval: builtinDoc(
    "eval",
    "Evaluate a string as an FTL expression.",
    "Parses and evaluates FTL expression text (not for JSON — use `?eval_json`). Do not eval untrusted strings.",
    "ref_builtins_expert.html",
    '"1+2"?eval'
  ),
  filter: builtinDoc(
    "filter",
    "Filter a sequence with a condition.",
    "Returns elements for which the condition (lambda / nested) holds — see manual for the exact syntax in your FreeMarker version.",
    "ref_builtins_sequence.html",
    "xs?filter(x -> x > 0)"
  ),
  first: builtinDoc(
    "first",
    "First element of a sequence.",
    "Returns the first subvariable of a sequence (error if empty unless combined with missing-value handlers).",
    "ref_builtins_sequence.html",
    "xs?first"
  ),
  float: builtinDoc(
    "float",
    "Number as java.lang.Float.",
    "Same numeric value with `Float` internal representation.",
    "ref_builtins_expert.html",
    "n?float"
  ),
  floor: builtinDoc(
    "floor",
    "Round toward −∞.",
    "Returns the nearest integer that is not greater than the number (floor).",
    "ref_builtins_number.html",
    "n?floor"
  ),
  groups: builtinDoc(
    "groups",
    "Regex match groups.",
    "Used with `?matches` results to access capturing groups.",
    "ref_builtins_string.html",
    "m?groups[1]"
  ),
  has_api: builtinDoc(
    "has_api",
    "Whether `?api` is available on the value.",
    "Returns a boolean; not affected by `api_builtin_enabled` alone — checks if the wrapped value supports API access.",
    "ref_builtins_expert.html",
    "value?has_api"
  ),
  has_content: builtinDoc(
    "has_content",
    "True if the value exists and is not empty.",
    "Empty means: empty string/markup, empty sequence/hash, exhausted collection. Numbers, dates, and booleans count as non-empty (even `0` / `false`). You can write `product.color?has_content` or `(product.color)?has_content` (parentheses also handle a missing `product`).",
    "ref_builtins_expert.html",
    "x?has_content"
  ),
  html: builtinDoc(
    "html",
    "HTML-escape a string.",
    "Escapes characters so the string is safe in HTML text (legacy; prefer output-format escaping when possible).",
    "ref_builtins_string.html",
    "s?html"
  ),
  index_of: builtinDoc(
    "index_of",
    "Index of a substring / element.",
    "Returns the index of the first occurrence, or -1 if not found.",
    "ref_builtins_string.html",
    's?index_of("x")'
  ),
  int: builtinDoc(
    "int",
    "Number as java.lang.Integer.",
    "Same numeric value with `Integer` internal representation.",
    "ref_builtins_expert.html",
    "n?int"
  ),
  interpret: builtinDoc(
    "interpret",
    "Interpret a string as an FTL template fragment.",
    "Returns a value you can invoke to render template text stored in a string.",
    "ref_builtins_expert.html",
    '"${1+2}"?interpret'
  ),
  is_boolean: builtinDoc(
    "is_boolean",
    "Type check: boolean.",
    "Returns whether the value is a boolean.",
    "ref_builtins_expert.html",
    "x?is_boolean"
  ),
  is_collection: builtinDoc(
    "is_collection",
    "Type check: collection.",
    "Returns whether the value is a collection (listable).",
    "ref_builtins_expert.html",
    "x?is_collection"
  ),
  is_date: builtinDoc(
    "is_date",
    "Type check: date-like.",
    "Returns whether the value is a date/time/date-time (see also `is_date_like`).",
    "ref_builtins_expert.html",
    "x?is_date"
  ),
  is_date_like: builtinDoc(
    "is_date_like",
    "Type check: date-like value.",
    "Returns whether the value is treated as date-like.",
    "ref_builtins_expert.html",
    "x?is_date_like"
  ),
  is_directive: builtinDoc(
    "is_directive",
    "Type check: directive.",
    "Returns whether the value is a directive (user-defined).",
    "ref_builtins_expert.html",
    "x?is_directive"
  ),
  is_enumerable: builtinDoc(
    "is_enumerable",
    "Type check: enumerable.",
    "Returns whether the value can be listed.",
    "ref_builtins_expert.html",
    "x?is_enumerable"
  ),
  is_hash: builtinDoc(
    "is_hash",
    "Type check: hash.",
    "Returns whether the value is a hash.",
    "ref_builtins_expert.html",
    "x?is_hash"
  ),
  is_hash_ex: builtinDoc(
    "is_hash_ex",
    "Type check: extended hash.",
    "Returns whether the value is an extended hash (supports `?keys` / `?values`).",
    "ref_builtins_expert.html",
    "x?is_hash_ex"
  ),
  is_indexable: builtinDoc(
    "is_indexable",
    "Type check: indexable.",
    "Returns whether the value supports `[index]`.",
    "ref_builtins_expert.html",
    "x?is_indexable"
  ),
  is_infinite: builtinDoc(
    "is_infinite",
    "Whether a number is infinite.",
    "Returns whether the number is infinite.",
    "ref_builtins_number.html",
    "n?is_infinite"
  ),
  is_macro: builtinDoc(
    "is_macro",
    "Type check: macro.",
    "Returns whether the value is a macro.",
    "ref_builtins_expert.html",
    "x?is_macro"
  ),
  is_markup_output: builtinDoc(
    "is_markup_output",
    "Type check: markup output.",
    "Returns whether the value is markup output (already escaped output).",
    "ref_builtins_expert.html",
    "x?is_markup_output"
  ),
  is_method: builtinDoc(
    "is_method",
    "Type check: method.",
    "Returns whether the value is a method.",
    "ref_builtins_expert.html",
    "x?is_method"
  ),
  is_nan: builtinDoc(
    "is_nan",
    "Whether a number is NaN.",
    "Returns whether the number is Not-a-Number.",
    "ref_builtins_number.html",
    "n?is_nan"
  ),
  is_node: builtinDoc(
    "is_node",
    "Type check: node.",
    "Returns whether the value is a node (XML/DOM-like).",
    "ref_builtins_expert.html",
    "x?is_node"
  ),
  is_number: builtinDoc(
    "is_number",
    "Type check: number.",
    "Returns whether the value is a number.",
    "ref_builtins_expert.html",
    "x?is_number"
  ),
  is_sequence: builtinDoc(
    "is_sequence",
    "Type check: sequence.",
    "Returns whether the value is a sequence.",
    "ref_builtins_expert.html",
    "x?is_sequence"
  ),
  is_string: builtinDoc(
    "is_string",
    "Type check: string.",
    "Returns whether the value is a string.",
    "ref_builtins_expert.html",
    "x?is_string"
  ),
  is_transform: builtinDoc(
    "is_transform",
    "Type check: transform.",
    "Returns whether the value is a transform.",
    "ref_builtins_expert.html",
    "x?is_transform"
  ),
  join: builtinDoc(
    "join",
    "Join sequence elements into a string.",
    "Concatenates elements with a separator string.",
    "ref_builtins_sequence.html",
    'xs?join(", ")'
  ),
  js_string: builtinDoc(
    "js_string",
    "Escape for a JavaScript string literal.",
    "Escapes the string for embedding inside a JS string.",
    "ref_builtins_string.html",
    "s?js_string"
  ),
  json_string: builtinDoc(
    "json_string",
    "Escape for JSON string content.",
    "Escapes the string for JSON string values.",
    "ref_builtins_string.html",
    "s?json_string"
  ),
  keep_after: builtinDoc(
    "keep_after",
    "Keep the part after a substring.",
    "Returns the part of the string after the first occurrence of the argument.",
    "ref_builtins_string.html",
    's?keep_after(":")'
  ),
  keep_after_last: builtinDoc(
    "keep_after_last",
    "Keep the part after the last substring.",
    "Returns the part after the last occurrence of the argument.",
    "ref_builtins_string.html",
    's?keep_after_last("/")'
  ),
  keep_before: builtinDoc(
    "keep_before",
    "Keep the part before a substring.",
    "Returns the part of the string before the first occurrence of the argument.",
    "ref_builtins_string.html",
    's?keep_before(":")'
  ),
  keep_before_last: builtinDoc(
    "keep_before_last",
    "Keep the part before the last substring.",
    "Returns the part before the last occurrence of the argument.",
    "ref_builtins_string.html",
    's?keep_before_last("/")'
  ),
  keys: builtinDoc(
    "keys",
    "Keys of a hash as a sequence.",
    "Returns the keys of a hash (order depends on the hash implementation).",
    "ref_builtins_hash.html",
    "h?keys"
  ),
  last: builtinDoc(
    "last",
    "Last element of a sequence.",
    "Returns the last subvariable of a sequence.",
    "ref_builtins_sequence.html",
    "xs?last"
  ),
  last_index_of: builtinDoc(
    "last_index_of",
    "Last index of a substring / element.",
    "Returns the index of the last occurrence, or -1 if not found.",
    "ref_builtins_string.html",
    's?last_index_of("x")'
  ),
  left_pad: builtinDoc(
    "left_pad",
    "Left-pad a string to a width.",
    "Pads on the left to at least the given width (optional pad string).",
    "ref_builtins_string.html",
    "s?left_pad(5)"
  ),
  length: builtinDoc(
    "length",
    "Character length of a string.",
    "Returns the number of characters in the string.",
    "ref_builtins_string.html",
    "s?length"
  ),
  long: builtinDoc(
    "long",
    "Number as java.lang.Long (or date as epoch ms).",
    "Numeric `Long` representation; for dates returns `getTime()`-style milliseconds.",
    "ref_builtins_expert.html",
    "n?long"
  ),
  lower_case: builtinDoc(
    "lower_case",
    "Lowercase string.",
    "Returns the lower-case version of the string.",
    "ref_builtins_string.html",
    "s?lower_case"
  ),
  map: builtinDoc(
    "map",
    "Map sequence elements.",
    "Transforms each element (lambda / nested syntax — see manual for your version).",
    "ref_builtins_sequence.html",
    "xs?map(x -> x*2)"
  ),
  markup_string: builtinDoc(
    "markup_string",
    "Markup as plain string source.",
    "Returns the markup source of a markup-output value.",
    "ref_builtins_expert.html",
    "m?markup_string"
  ),
  matches: builtinDoc(
    "matches",
    "Regex match.",
    "Tests/returns matches for a regular expression (see manual for return forms).",
    "ref_builtins_string.html",
    's?matches(r"\\d+")'
  ),
  max: builtinDoc(
    "max",
    "Maximum of numbers.",
    "Returns the largest number among arguments / sequence (see manual forms).",
    "ref_builtins_number.html",
    "n?max(a, b)"
  ),
  min: builtinDoc(
    "min",
    "Minimum of numbers.",
    "Returns the smallest number among arguments / sequence (see manual forms).",
    "ref_builtins_number.html",
    "n?min(a, b)"
  ),
  namespace: builtinDoc(
    "namespace",
    "Namespace of a macro/function.",
    "Expert built-in related to namespaces of user-defined directives.",
    "ref_builtins_expert.html",
    "m?namespace"
  ),
  new: builtinDoc(
    "new",
    "Construct a TemplateModel by class name (restricted).",
    "Security-sensitive; often disabled/restricted in production configurations.",
    "ref_builtins_expert.html",
    '"com.example.Foo"?new()'
  ),
  node_name: builtinDoc(
    "node_name",
    "Name of an XML/node.",
    "Returns the node name (e.g. element local name).",
    "ref_builtins_node.html",
    "node?node_name"
  ),
  node_namespace: builtinDoc(
    "node_namespace",
    "Namespace URI of an XML node.",
    "Returns the namespace URI string for the node, when applicable.",
    "ref_builtins_node.html",
    "node?node_namespace"
  ),
  node_type: builtinDoc(
    "node_type",
    "Type of an XML/node.",
    "Returns a string describing the node type (element, text, …).",
    "ref_builtins_node.html",
    "node?node_type"
  ),
  number: builtinDoc(
    "number",
    "Convert to number.",
    "Converts a string (or compatible value) to a number.",
    "ref_builtins_number.html",
    '"12"?number'
  ),
  number_to_date: builtinDoc(
    "number_to_date",
    "Epoch millis → date.",
    "Converts a number (millis) to a date value.",
    "ref_builtins_expert.html",
    "ms?number_to_date"
  ),
  number_to_datetime: builtinDoc(
    "number_to_datetime",
    "Epoch millis → date-time.",
    "Converts a number (millis) to a date-time value.",
    "ref_builtins_expert.html",
    "ms?number_to_datetime"
  ),
  number_to_time: builtinDoc(
    "number_to_time",
    "Epoch millis → time.",
    "Converts a number (millis) to a time value.",
    "ref_builtins_expert.html",
    "ms?number_to_time"
  ),
  parent: builtinDoc(
    "parent",
    "Parent of an XML node.",
    "Returns the parent node.",
    "ref_builtins_node.html",
    "node?parent"
  ),
  remove_ending: builtinDoc(
    "remove_ending",
    "Remove a suffix if present.",
    "Removes the ending substring when the string ends with it.",
    "ref_builtins_string.html",
    's?remove_ending(".tmp")'
  ),
  remove_beginning: builtinDoc(
    "remove_beginning",
    "Remove a prefix if present.",
    "Removes the beginning substring when the string starts with it.",
    "ref_builtins_string.html",
    's?remove_beginning("pre")'
  ),
  replace: builtinDoc(
    "replace",
    "Replace substrings or regex matches.",
    "Replaces occurrences of a substring/pattern with another string (flags optional).",
    "ref_builtins_string.html",
    's?replace("a", "b")'
  ),
  reverse: builtinDoc(
    "reverse",
    "Reversed sequence.",
    "Returns the sequence in reverse order.",
    "ref_builtins_sequence.html",
    "xs?reverse"
  ),
  right_pad: builtinDoc(
    "right_pad",
    "Right-pad a string to a width.",
    "Pads on the right to at least the given width.",
    "ref_builtins_string.html",
    "s?right_pad(5)"
  ),
  root: builtinDoc(
    "root",
    "Root of an XML node tree.",
    "Returns the root node.",
    "ref_builtins_node.html",
    "node?root"
  ),
  round: builtinDoc(
    "round",
    "Round to nearest integer.",
    "Rounds the number to the nearest integer (half-up style per FreeMarker rules).",
    "ref_builtins_number.html",
    "n?round"
  ),
  rtf: builtinDoc(
    "rtf",
    "RTF-escape a string.",
    "Escapes for Rich Text Format output.",
    "ref_builtins_string.html",
    "s?rtf"
  ),
  seq_contains: builtinDoc(
    "seq_contains",
    "Whether a sequence contains an element.",
    "Sequence membership test.",
    "ref_builtins_sequence.html",
    "xs?seq_contains(v)"
  ),
  seq_index_of: builtinDoc(
    "seq_index_of",
    "First index of an element in a sequence.",
    "Returns the index or -1.",
    "ref_builtins_sequence.html",
    "xs?seq_index_of(v)"
  ),
  seq_last_index_of: builtinDoc(
    "seq_last_index_of",
    "Last index of an element in a sequence.",
    "Returns the last matching index or -1.",
    "ref_builtins_sequence.html",
    "xs?seq_last_index_of(v)"
  ),
  sequence: builtinDoc(
    "sequence",
    "Convert a listable value to a sequence.",
    "Useful when you need `?size` / indexing on iterators/collections. Prefer fixing the data-model when possible.",
    "ref_builtins_expert.html",
    "it?sequence"
  ),
  short: builtinDoc(
    "short",
    "Number as java.lang.Short.",
    "Same numeric value with `Short` internal representation.",
    "ref_builtins_expert.html",
    "n?short"
  ),
  size: builtinDoc(
    "size",
    "Number of subvariables (sequence/hash) or length.",
    "For sequences/hashes: element/key count. Often preferred over Java `size()` via `?api`.",
    "ref_builtins_sequence.html",
    "xs?size"
  ),
  sort: builtinDoc(
    "sort",
    "Sorted sequence.",
    "Returns a sorted copy of the sequence.",
    "ref_builtins_sequence.html",
    "xs?sort"
  ),
  sort_by: builtinDoc(
    "sort_by",
    "Sort sequence of hashes by a key.",
    "Sorts using a subvariable name (or list of names) as the sort key.",
    "ref_builtins_sequence.html",
    'xs?sort_by("name")'
  ),
  split: builtinDoc(
    "split",
    "Split a string into a sequence.",
    "Splits on a separator string or regex.",
    "ref_builtins_string.html",
    's?split(",")'
  ),
  starts_with: builtinDoc(
    "starts_with",
    "Test string prefix.",
    "Returns whether the string starts with the given substring.",
    "ref_builtins_string.html",
    's?starts_with("pre")'
  ),
  string: builtinDoc(
    "string",
    "Convert to string (optional format).",
    "Converts numbers/dates/booleans/etc. to string; format argument depends on type.",
    "ref_builtins_string.html",
    'n?string("0.00")'
  ),
  substring: builtinDoc(
    "substring",
    "Substring by indexes.",
    "Deprecated in favor of slicing (`s[start..<end]`) in modern FreeMarker, but still widely seen.",
    "ref_builtins_string.html",
    "s?substring(0, 3)"
  ),
  switch: builtinDoc(
    "switch",
    "Inline switch expression.",
    "Chooses a result from value/match pairs (see manual for exact parameter list).",
    "ref_builtins_expert.html",
    'x?switch(1, "a", 2, "b", "other")'
  ),
  then: builtinDoc(
    "then",
    "Inline if-then-else.",
    "Boolean left value chooses between two results: `cond?then(whenTrue, whenFalse)`.",
    "ref_builtins_expert.html",
    'flag?then("yes", "no")'
  ),
  time: builtinDoc(
    "time",
    "Time-only value / convert to time.",
    "Used with time values or conversion (see manual for formats).",
    "ref_builtins_date.html",
    "t?time"
  ),
  trim: builtinDoc(
    "trim",
    "Trim leading/trailing whitespace.",
    "Returns the string without bordering white-space.",
    "ref_builtins_string.html",
    "s?trim"
  ),
  truncate: builtinDoc(
    "truncate",
    "Truncate a string to a length.",
    "Shortens the string, optionally appending a terminator (see manual variants).",
    "ref_builtins_string.html",
    "s?truncate(20)"
  ),
  uncap_first: builtinDoc(
    "uncap_first",
    "Lowercase the first character.",
    "Returns the string with the first character converted to lower case.",
    "ref_builtins_string.html",
    '"Hello"?uncap_first'
  ),
  upper_case: builtinDoc(
    "upper_case",
    "Uppercase string.",
    "Returns the upper-case version of the string.",
    "ref_builtins_string.html",
    "s?upper_case"
  ),
  url: builtinDoc(
    "url",
    "URL-encode a string.",
    "Percent-encodes for URL query/path usage (charset options in manual).",
    "ref_builtins_string.html",
    "s?url"
  ),
  values: builtinDoc(
    "values",
    "Values of a hash as a sequence.",
    "Returns the values of a hash.",
    "ref_builtins_hash.html",
    "h?values"
  ),
  web_safe: builtinDoc(
    "web_safe",
    "Deprecated HTML escaping alias.",
    "Historical alias related to HTML escaping; prefer `?html` / output formats.",
    "ref_builtins_string.html",
    "s?web_safe"
  ),
  word_list: builtinDoc(
    "word_list",
    "Split into words.",
    "Returns the sequence of words in the string.",
    "ref_builtins_string.html",
    "s?word_list"
  ),
  xhtml: builtinDoc(
    "xhtml",
    "XHTML-escape a string.",
    "Escapes for XHTML text content.",
    "ref_builtins_string.html",
    "s?xhtml"
  ),
  xml: builtinDoc(
    "xml",
    "XML-escape a string.",
    "Escapes for XML text content.",
    "ref_builtins_string.html",
    "s?xml"
  ),
  absolute_template_name: builtinDoc(
    "absolute_template_name",
    "Resolve a template name to an absolute one.",
    "Converts a template name that may be relative to the current template into an absolute name. With an argument, resolves relative to that base name instead.",
    "ref_builtins_string.html",
    "\"lib.ftl\"?absolute_template_name"
  ),
  ancestors: builtinDoc(
    "ancestors",
    "Ancestor nodes of a node.",
    "Returns the sequence of ancestor nodes (parent first). With arguments, only ancestors with the given node names are kept.",
    "ref_builtins_node.html",
    "node?ancestors"
  ),
  blank_to_null: builtinDoc(
    "blank_to_null",
    "Blank string → missing value.",
    "Returns a missing value (null) if the string is empty or whitespace-only, otherwise the string. Combine with `!` / `??`.",
    "ref_builtins_alphaidx.html",
    "s?blank_to_null!\"n/a\""
  ),
  c_lower_case: builtinDoc(
    "c_lower_case",
    "Lower-case, locale-independent.",
    "Like `?lower_case`, but always uses the root (C) locale rules. Use it for computer-language output (identifiers, keys).",
    "ref_builtins_string.html",
    "s?c_lower_case"
  ),
  c_upper_case: builtinDoc(
    "c_upper_case",
    "Upper-case, locale-independent.",
    "Like `?upper_case`, but always uses the root (C) locale rules. Use it for computer-language output (identifiers, keys).",
    "ref_builtins_string.html",
    "s?c_upper_case"
  ),
  chunk: builtinDoc(
    "chunk",
    "Split a sequence into fixed-size chunks.",
    "Returns a sequence of sequences of the given size. With a filler, the last chunk is padded to full size.",
    "ref_builtins_sequence.html",
    "seq?chunk(3)"
  ),
  cn: builtinDoc(
    "cn",
    "Like `?c`, but prints `null` for a missing value.",
    "Computer-language formatting like `?c`; a null/missing value is printed as the null literal of the current `c_format`.",
    "ref_builtins_alphaidx.html",
    "x?cn"
  ),
  counter: builtinDoc(
    "counter",
    "1-based index of the loop variable.",
    "Only on a `#list` / `#items` loop variable. Like `?index` but starts from 1.",
    "ref_builtins_loop_var.html",
    "item?counter"
  ),
  date_if_unknown: builtinDoc(
    "date_if_unknown",
    "Treat an unknown-type date as date-only.",
    "If the date-like value has unknown type (e.g. from `java.util.Date`), marks it as date-only; otherwise returns it unchanged.",
    "ref_builtins_date.html",
    "d?date_if_unknown"
  ),
  datetime_if_unknown: builtinDoc(
    "datetime_if_unknown",
    "Treat an unknown-type date as date-time.",
    "If the date-like value has unknown type, marks it as date-time; otherwise returns it unchanged.",
    "ref_builtins_date.html",
    "d?datetime_if_unknown"
  ),
  dedent: builtinDoc(
    "dedent",
    "Remove common leading indentation (2.3.35+).",
    "Without arguments, removes the indentation common to all non-blank lines. With a prefix argument, removes that prefix from the start of lines; the optional boolean (default `true`) also trims trailing whitespace.",
    "ref_builtins_string.html",
    "s?dedent"
  ),
  drop_while: builtinDoc(
    "drop_while",
    "Drop leading elements while a condition holds.",
    "Returns the sequence without its leading elements for which the predicate (lambda or function) is true.",
    "ref_builtins_sequence.html",
    "seq?drop_while(x -> x < 0)"
  ),
  empty_to_null: builtinDoc(
    "empty_to_null",
    "Empty string → missing value.",
    "Returns a missing value (null) if the string is empty, otherwise the string. Combine with `!` / `??`.",
    "ref_builtins_alphaidx.html",
    "s?empty_to_null!\"n/a\""
  ),
  eval_json: builtinDoc(
    "eval_json",
    "Parse a JSON string into a value.",
    "Parses JSON text into FTL hashes, sequences, strings, numbers and booleans. Safer than `?eval` for JSON input.",
    "ref_builtins_expert.html",
    "jsonText?eval_json"
  ),
  exists: builtinDoc(
    "exists",
    "Deprecated: does the value exist?",
    "Deprecated; use `value??` instead.",
    "ref_depr_builtin.html",
    "x?exists"
  ),
  has_next: builtinDoc(
    "has_next",
    "Is there another item after this one?",
    "Only on a `#list` / `#items` loop variable. False for the last item.",
    "ref_builtins_loop_var.html",
    "item?has_next"
  ),
  if_exists: builtinDoc(
    "if_exists",
    "Deprecated: value or empty.",
    "Deprecated; use `value!` instead.",
    "ref_depr_builtin.html",
    "x?if_exists"
  ),
  indent: builtinDoc(
    "indent",
    "Add a prefix to every line (2.3.35+).",
    "Prepends the prefix to each line; the optional boolean (default `true`) also trims trailing whitespace.",
    "ref_builtins_string.html",
    "s?indent(\"  \")"
  ),
  index: builtinDoc(
    "index",
    "0-based index of the loop variable.",
    "Only on a `#list` / `#items` loop variable.",
    "ref_builtins_loop_var.html",
    "item?index"
  ),
  is_collection_ex: builtinDoc(
    "is_collection_ex",
    "Is it a collection (extended check)?",
    "Like `?is_collection`, but also true for values that can only be listed (e.g. Java iterables wrapped as collections).",
    "ref_builtins_expert.html",
    "x?is_collection_ex"
  ),
  is_date_only: builtinDoc(
    "is_date_only",
    "Is it a date-only value?",
    "True for date values without time part.",
    "ref_builtins_expert.html",
    "x?is_date_only"
  ),
  is_datetime: builtinDoc(
    "is_datetime",
    "Is it a date-time value?",
    "True for date values with both date and time part.",
    "ref_builtins_expert.html",
    "x?is_datetime"
  ),
  is_even_item: builtinDoc(
    "is_even_item",
    "Is the loop item at an even position (1-based)?",
    "Only on a `#list` / `#items` loop variable: true for the 2nd, 4th, … item.",
    "ref_builtins_loop_var.html",
    "item?is_even_item"
  ),
  is_first: builtinDoc(
    "is_first",
    "Is this the first loop item?",
    "Only on a `#list` / `#items` loop variable.",
    "ref_builtins_loop_var.html",
    "item?is_first"
  ),
  is_last: builtinDoc(
    "is_last",
    "Is this the last loop item?",
    "Only on a `#list` / `#items` loop variable.",
    "ref_builtins_loop_var.html",
    "item?is_last"
  ),
  is_odd_item: builtinDoc(
    "is_odd_item",
    "Is the loop item at an odd position (1-based)?",
    "Only on a `#list` / `#items` loop variable: true for the 1st, 3rd, … item.",
    "ref_builtins_loop_var.html",
    "item?is_odd_item"
  ),
  is_time: builtinDoc(
    "is_time",
    "Is it a time-only value?",
    "True for date values that only have a time part.",
    "ref_builtins_expert.html",
    "x?is_time"
  ),
  is_unknown_date_like: builtinDoc(
    "is_unknown_date_like",
    "Is it a date of unknown type?",
    "True for date-like values whose type (date / time / date-time) is unknown.",
    "ref_builtins_expert.html",
    "x?is_unknown_date_like"
  ),
  iso: builtinDoc(
    "iso",
    "ISO 8601 format (the time zone given as argument, seconds).",
    "Formats the date as ISO 8601 in the time zone given as argument, with precision seconds (milliseconds only when non-zero).",
    "ref_builtins_date.html",
    "d?iso(tz)"
  ),
  iso_h: builtinDoc(
    "iso_h",
    "ISO 8601 format (the time zone given as argument, hours).",
    "Formats the date as ISO 8601 in the time zone given as argument, with precision hours.",
    "ref_builtins_date.html",
    "d?iso_h(tz)"
  ),
  iso_h_nz: builtinDoc(
    "iso_h_nz",
    "ISO 8601 format (the time zone given as argument, hours).",
    "Formats the date as ISO 8601 in the time zone given as argument, with precision hours. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_h_nz(tz)"
  ),
  iso_local: builtinDoc(
    "iso_local",
    "ISO 8601 format (the current time zone, seconds).",
    "Formats the date as ISO 8601 in the current time zone, with precision seconds (milliseconds only when non-zero).",
    "ref_builtins_date.html",
    "d?iso_local"
  ),
  iso_local_h: builtinDoc(
    "iso_local_h",
    "ISO 8601 format (the current time zone, hours).",
    "Formats the date as ISO 8601 in the current time zone, with precision hours.",
    "ref_builtins_date.html",
    "d?iso_local_h"
  ),
  iso_local_h_nz: builtinDoc(
    "iso_local_h_nz",
    "ISO 8601 format (the current time zone, hours).",
    "Formats the date as ISO 8601 in the current time zone, with precision hours. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_local_h_nz"
  ),
  iso_local_m: builtinDoc(
    "iso_local_m",
    "ISO 8601 format (the current time zone, minutes).",
    "Formats the date as ISO 8601 in the current time zone, with precision minutes.",
    "ref_builtins_date.html",
    "d?iso_local_m"
  ),
  iso_local_m_nz: builtinDoc(
    "iso_local_m_nz",
    "ISO 8601 format (the current time zone, minutes).",
    "Formats the date as ISO 8601 in the current time zone, with precision minutes. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_local_m_nz"
  ),
  iso_local_ms: builtinDoc(
    "iso_local_ms",
    "ISO 8601 format (the current time zone, milliseconds).",
    "Formats the date as ISO 8601 in the current time zone, with precision milliseconds.",
    "ref_builtins_date.html",
    "d?iso_local_ms"
  ),
  iso_local_ms_nz: builtinDoc(
    "iso_local_ms_nz",
    "ISO 8601 format (the current time zone, milliseconds).",
    "Formats the date as ISO 8601 in the current time zone, with precision milliseconds. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_local_ms_nz"
  ),
  iso_local_nz: builtinDoc(
    "iso_local_nz",
    "ISO 8601 format (the current time zone, seconds).",
    "Formats the date as ISO 8601 in the current time zone, with precision seconds (milliseconds only when non-zero). Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_local_nz"
  ),
  iso_m: builtinDoc(
    "iso_m",
    "ISO 8601 format (the time zone given as argument, minutes).",
    "Formats the date as ISO 8601 in the time zone given as argument, with precision minutes.",
    "ref_builtins_date.html",
    "d?iso_m(tz)"
  ),
  iso_m_nz: builtinDoc(
    "iso_m_nz",
    "ISO 8601 format (the time zone given as argument, minutes).",
    "Formats the date as ISO 8601 in the time zone given as argument, with precision minutes. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_m_nz(tz)"
  ),
  iso_ms: builtinDoc(
    "iso_ms",
    "ISO 8601 format (the time zone given as argument, milliseconds).",
    "Formats the date as ISO 8601 in the time zone given as argument, with precision milliseconds.",
    "ref_builtins_date.html",
    "d?iso_ms(tz)"
  ),
  iso_ms_nz: builtinDoc(
    "iso_ms_nz",
    "ISO 8601 format (the time zone given as argument, milliseconds).",
    "Formats the date as ISO 8601 in the time zone given as argument, with precision milliseconds. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_ms_nz(tz)"
  ),
  iso_nz: builtinDoc(
    "iso_nz",
    "ISO 8601 format (the time zone given as argument, seconds).",
    "Formats the date as ISO 8601 in the time zone given as argument, with precision seconds (milliseconds only when non-zero). Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_nz(tz)"
  ),
  iso_utc: builtinDoc(
    "iso_utc",
    "ISO 8601 format (UTC, seconds).",
    "Formats the date as ISO 8601 in UTC, with precision seconds (milliseconds only when non-zero).",
    "ref_builtins_date.html",
    "d?iso_utc"
  ),
  iso_utc_fz: builtinDoc(
    "iso_utc_fz",
    "ISO 8601 format (UTC, seconds).",
    "Formats the date as ISO 8601 in UTC, with precision seconds (milliseconds only when non-zero). Always shows the zone offset, even `Z` for UTC.",
    "ref_builtins_date.html",
    "d?iso_utc_fz"
  ),
  iso_utc_h: builtinDoc(
    "iso_utc_h",
    "ISO 8601 format (UTC, hours).",
    "Formats the date as ISO 8601 in UTC, with precision hours.",
    "ref_builtins_date.html",
    "d?iso_utc_h"
  ),
  iso_utc_h_nz: builtinDoc(
    "iso_utc_h_nz",
    "ISO 8601 format (UTC, hours).",
    "Formats the date as ISO 8601 in UTC, with precision hours. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_utc_h_nz"
  ),
  iso_utc_m: builtinDoc(
    "iso_utc_m",
    "ISO 8601 format (UTC, minutes).",
    "Formats the date as ISO 8601 in UTC, with precision minutes.",
    "ref_builtins_date.html",
    "d?iso_utc_m"
  ),
  iso_utc_m_nz: builtinDoc(
    "iso_utc_m_nz",
    "ISO 8601 format (UTC, minutes).",
    "Formats the date as ISO 8601 in UTC, with precision minutes. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_utc_m_nz"
  ),
  iso_utc_ms: builtinDoc(
    "iso_utc_ms",
    "ISO 8601 format (UTC, milliseconds).",
    "Formats the date as ISO 8601 in UTC, with precision milliseconds.",
    "ref_builtins_date.html",
    "d?iso_utc_ms"
  ),
  iso_utc_ms_nz: builtinDoc(
    "iso_utc_ms_nz",
    "ISO 8601 format (UTC, milliseconds).",
    "Formats the date as ISO 8601 in UTC, with precision milliseconds. Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_utc_ms_nz"
  ),
  iso_utc_nz: builtinDoc(
    "iso_utc_nz",
    "ISO 8601 format (UTC, seconds).",
    "Formats the date as ISO 8601 in UTC, with precision seconds (milliseconds only when non-zero). Without the zone offset.",
    "ref_builtins_date.html",
    "d?iso_utc_nz"
  ),
  item_cycle: builtinDoc(
    "item_cycle",
    "Cycle through values per loop item.",
    "Only on a `#list` / `#items` loop variable: returns the argument at position (index mod argument count), e.g. alternating CSS classes.",
    "ref_builtins_loop_var.html",
    "item?item_cycle('odd', 'even')"
  ),
  item_parity: builtinDoc(
    "item_parity",
    "\"odd\" / \"even\" for the loop item.",
    "Only on a `#list` / `#items` loop variable (1-based: the first item is \"odd\").",
    "ref_builtins_loop_var.html",
    "item?item_parity"
  ),
  item_parity_cap: builtinDoc(
    "item_parity_cap",
    "\"Odd\" / \"Even\" for the loop item.",
    "Like `?item_parity`, capitalized.",
    "ref_builtins_loop_var.html",
    "item?item_parity_cap"
  ),
  j_string: builtinDoc(
    "j_string",
    "Escape as a Java string literal body.",
    "Escapes the string for use inside a Java string literal (without the quotes).",
    "ref_builtins_string.html",
    "s?j_string"
  ),
  lines: builtinDoc(
    "lines",
    "Split a string into lines (2.3.35+).",
    "Returns a sequence of lines; `\\n`, `\\r` and `\\r\\n` are line breaks, and the line breaks are not included.",
    "ref_builtins_string.html",
    "s?lines"
  ),
  lower_abc: builtinDoc(
    "lower_abc",
    "Number → a, b, c … letters.",
    "1 → `a`, 2 → `b`, 26 → `z`, 27 → `aa` …",
    "ref_builtins_number.html",
    "n?lower_abc"
  ),
  next_sibling: builtinDoc(
    "next_sibling",
    "Next sibling node.",
    "The following sibling of an XML node, or missing if there is none.",
    "ref_builtins_node.html",
    "node?next_sibling"
  ),
  no_esc: builtinDoc(
    "no_esc",
    "Output without auto-escaping.",
    "Marks the string as markup so auto-escaping does not escape it. Use only for trusted markup.",
    "ref_builtins_string.html",
    "html?no_esc"
  ),
  previous_sibling: builtinDoc(
    "previous_sibling",
    "Previous sibling node.",
    "The preceding sibling of an XML node, or missing if there is none.",
    "ref_builtins_node.html",
    "node?previous_sibling"
  ),
  take_while: builtinDoc(
    "take_while",
    "Keep leading elements while a condition holds.",
    "Returns the leading elements for which the predicate (lambda or function) is true.",
    "ref_builtins_sequence.html",
    "seq?take_while(x -> x > 0)"
  ),
  time_if_unknown: builtinDoc(
    "time_if_unknown",
    "Treat an unknown-type date as time-only.",
    "If the date-like value has unknown type, marks it as time-only; otherwise returns it unchanged.",
    "ref_builtins_date.html",
    "d?time_if_unknown"
  ),
  trim_to_null: builtinDoc(
    "trim_to_null",
    "Trim; blank → missing value.",
    "Trims the string; returns a missing value (null) if the result is empty. Combine with `!` / `??`.",
    "ref_builtins_alphaidx.html",
    "s?trim_to_null!\"n/a\""
  ),
  truncate_c: builtinDoc(
    "truncate_c",
    "Truncate at any character.",
    "Like `?truncate`, but may cut in the middle of a word.",
    "ref_builtins_string.html",
    "s?truncate_c(20)"
  ),
  truncate_c_m: builtinDoc(
    "truncate_c_m",
    "Truncate at any character, markup terminator.",
    "Like `?truncate_c`, but the terminator is markup (e.g. `<span>…</span>`) and the result is markup.",
    "ref_builtins_string.html",
    "s?truncate_c_m(20, '<i>…</i>'?no_esc)"
  ),
  truncate_m: builtinDoc(
    "truncate_m",
    "Truncate with a markup terminator.",
    "Like `?truncate`, but the terminator is markup and the result is markup.",
    "ref_builtins_string.html",
    "s?truncate_m(20, '<i>…</i>'?no_esc)"
  ),
  truncate_w: builtinDoc(
    "truncate_w",
    "Truncate at a word boundary.",
    "Like `?truncate`, but only cuts at word boundaries (may return a shorter result).",
    "ref_builtins_string.html",
    "s?truncate_w(20)"
  ),
  truncate_w_m: builtinDoc(
    "truncate_w_m",
    "Truncate at a word boundary, markup terminator.",
    "Like `?truncate_w`, but the terminator is markup and the result is markup.",
    "ref_builtins_string.html",
    "s?truncate_w_m(20, '<i>…</i>'?no_esc)"
  ),
  upper_abc: builtinDoc(
    "upper_abc",
    "Number → A, B, C … letters.",
    "1 → `A`, 2 → `B`, 26 → `Z`, 27 → `AA` …",
    "ref_builtins_number.html",
    "n?upper_abc"
  ),
  url_path: builtinDoc(
    "url_path",
    "URL-escape a path, keeping `/`.",
    "Like `?url`, but does not escape `/`, so it can be used on whole paths.",
    "ref_builtins_string.html",
    "path?url_path"
  ),
  wrap: builtinDoc(
    "wrap",
    "Word-wrap text to a width (2.3.35+).",
    "Wraps lines longer than the width at word boundaries. Optional prefixes for the first line and the following lines.",
    "ref_builtins_string.html",
    "s?wrap(72)"
  ),
};

/** Directive (`#name`) documentation keyed by name. */
export const DIRECTIVE_REF: Record<string, RefDoc> = {
  call: directiveDoc(
    "call",
    "Deprecated: call a macro.",
    "Old syntax for calling a macro. Use `<@name …>` instead.",
    "ref_depr_directive.html",
    "<#call name args…>"
  ),
  comment: directiveDoc(
    "comment",
    "Deprecated: ignored block.",
    "Its body is not executed or printed. Use an FTL comment `<#-- … -->` instead.",
    "ref_depr_directive.html",
    "<#comment>\n  …\n</#comment>"
  ),
  foreach: directiveDoc(
    "foreach",
    "Deprecated: iterate a sequence.",
    "Old form of `#list` with the loop variable first. Use `<#list seq as x>` instead.",
    "ref_depr_directive.html",
    "<#foreach x in seq>\n  …\n</#foreach>"
  ),
  assign: directiveDoc(
    "assign",
    "Create/replace a variable in the current namespace.",
    "Assigns one or more variables. Can be a short tag or a block assignment.",
    "ref_directive_assign.html",
    '<#assign x = 1>\n<#assign x>\n  …\n</#assign>'
  ),
  attempt: directiveDoc(
    "attempt",
    "Try a block; recover on error.",
    "Runs the nested content; on failure jumps to `#recover`.",
    "ref_directive_attempt.html",
    "<#attempt>\n  …\n<#recover>\n  …\n</#attempt>"
  ),
  autoesc: directiveDoc(
    "autoesc",
    "Enable auto-escaping in a block.",
    "Turns automatic escaping on for the nested content (output-format dependent).",
    "ref_directive_autoesc.html",
    "<#autoesc>\n  …\n</#autoesc>"
  ),
  break: directiveDoc(
    "break",
    "Exit the nearest `#list` / `#switch`.",
    "Breaks out of list iteration or switch.",
    "ref_directive_break.html",
    "<#break>"
  ),
  case: directiveDoc(
    "case",
    "Switch case label.",
    "Used inside `#switch`.",
    "ref_directive_switch.html",
    "<#case value>"
  ),
  on: directiveDoc(
    "on",
    "Switch branch for one or more values (FreeMarker 2.3.34+).",
    "Used inside `#switch` instead of `#case`: `<#on a, b>` matches any listed value and never falls through, so no `#break` is needed. Do not mix `#on` and `#case` in the same `#switch`.",
    "ref_directive_switch.html",
    "<#on value1, value2>"
  ),
  compress: directiveDoc(
    "compress",
    "Compress whitespace in output.",
    "Removes superfluous white-space from the nested output.",
    "ref_directive_compress.html",
    "<#compress>\n  …\n</#compress>"
  ),
  continue: directiveDoc(
    "continue",
    "Continue the nearest `#list`.",
    "Skips to the next list iteration.",
    "ref_directive_continue.html",
    "<#continue>"
  ),
  default: directiveDoc(
    "default",
    "Default branch of `#switch`.",
    "Used inside `#switch` when no `#case` matched.",
    "ref_directive_switch.html",
    "<#default>"
  ),
  else: directiveDoc(
    "else",
    "Else branch of `#if` / `#list`.",
    "Alternative branch when the condition is false / list is empty.",
    "ref_directive_if.html",
    "<#else>"
  ),
  elseif: directiveDoc(
    "elseif",
    "Else-if branch of `#if`.",
    "Requires a condition expression.",
    "ref_directive_if.html",
    "<#elseif condition>"
  ),
  escape: directiveDoc(
    "escape",
    "Legacy escaping block.",
    "Historical escaping directive; prefer output formats / auto-escaping when possible.",
    "ref_directive_escape.html",
    "<#escape x as x?html>\n  …\n</#escape>"
  ),
  fallback: directiveDoc(
    "fallback",
    "Fall back in a transform chain.",
    "Used with transformative directives; see manual.",
    "ref_directive_visit.html",
    "<#fallback>"
  ),
  flush: directiveDoc(
    "flush",
    "Flush the output buffer.",
    "Asks the runtime to flush buffered output.",
    "ref_directive_flush.html",
    "<#flush>"
  ),
  ftl: directiveDoc(
    "ftl",
    "Template header settings.",
    "Declares charset/encoding and other template-level settings; usually first.",
    "ref_directive_ftl.html",
    '<#ftl encoding="UTF-8">'
  ),
  function: directiveDoc(
    "function",
    "Define a callable function.",
    "Defines a function invoked as an expression; use `#return` inside.",
    "ref_directive_function.html",
    "<#function add a b>\n  <#return a + b>\n</#function>"
  ),
  global: directiveDoc(
    "global",
    "Assign in the global namespace.",
    "Like `#assign` but targets the global namespace.",
    "ref_directive_global.html",
    "<#global x = 1>"
  ),
  if: directiveDoc(
    "if",
    "Conditional block.",
    "Branches with `#elseif` / `#else`.",
    "ref_directive_if.html",
    "<#if cond>\n  …\n<#elseif other>\n  …\n<#else>\n  …\n</#if>"
  ),
  import: directiveDoc(
    "import",
    "Import a library into a namespace.",
    "Loads another template’s macros/functions as `ns.*`.",
    "ref_directive_import.html",
    '<#import "lib.ftl" as lib>'
  ),
  include: directiveDoc(
    "include",
    "Insert another template.",
    "Processes the referenced template inline.",
    "ref_directive_include.html",
    '<#include "header.ftl">'
  ),
  items: directiveDoc(
    "items",
    "Body for `#list` with separators.",
    "Used with `#list` / `#sep` for item rendering.",
    "ref_directive_list.html",
    "<#list xs>\n  <#items as x>…</#items>\n</#list>"
  ),
  list: directiveDoc(
    "list",
    "Iterate a sequence or hash.",
    "Classic form: `<#list seq as x>…</#list>`. Also supports hash listing and empty `#else`.",
    "ref_directive_list.html",
    "<#list items as item>\n  ${item}\n</#list>"
  ),
  local: directiveDoc(
    "local",
    "Assign a local in macro/function.",
    "Creates a variable local to the current macro/function.",
    "ref_directive_local.html",
    "<#local x = 1>"
  ),
  lt: directiveDoc(
    "lt",
    "Left-trim the following line break.",
    "Whitespace control: removes the next linebreak.",
    "ref_directive_nt.html",
    "<#lt>"
  ),
  macro: directiveDoc(
    "macro",
    "Define a user directive.",
    "Callable with `<@name …>`. Parameters listed in the `#macro` tag.",
    "ref_directive_macro.html",
    "<#macro greeter name>\n  Hello ${name}\n</#macro>"
  ),
  nested: directiveDoc(
    "nested",
    "Render nested content of a macro call.",
    "Inside a macro, outputs the caller’s nested body.",
    "ref_directive_nested.html",
    "<#nested>"
  ),
  noautoesc: directiveDoc(
    "noautoesc",
    "Disable auto-escaping in a block.",
    "Turns automatic escaping off for nested content.",
    "ref_directive_noautoesc.html",
    "<#noautoesc>\n  …\n</#noautoesc>"
  ),
  noescape: directiveDoc(
    "noescape",
    "Disable legacy `#escape` in a block.",
    "Opposite of `#escape` for legacy escaping sections.",
    "ref_directive_escape.html",
    "<#noescape>\n  …\n</#noescape>"
  ),
  noparse: directiveDoc(
    "noparse",
    "Treat nested content as raw text.",
    "Does not interpret FTL inside the block.",
    "ref_directive_noparse.html",
    "<#noparse>\n  ${notInterpreted}\n</#noparse>"
  ),
  nt: directiveDoc(
    "nt",
    "No-trim whitespace control.",
    "Whitespace-stripping control tag; see manual.",
    "ref_directive_nt.html",
    "<#nt>"
  ),
  outputformat: directiveDoc(
    "outputformat",
    "Set output format for a block.",
    "Changes the output format (HTML/XML/…) for nested content.",
    "ref_directive_outputformat.html",
    '<#outputformat "HTML">\n  …\n</#outputformat>'
  ),
  recover: directiveDoc(
    "recover",
    "Handler for `#attempt` failures.",
    "Must follow `#attempt`.",
    "ref_directive_attempt.html",
    "<#recover>\n  …"
  ),
  recurse: directiveDoc(
    "recurse",
    "Recurse for XML processing.",
    "Used with `#visit` for node trees.",
    "ref_directive_visit.html",
    "<#recurse>"
  ),
  return: directiveDoc(
    "return",
    "Return from `#function` / exit `#macro`.",
    "In functions, returns a value; in macros, exits early.",
    "ref_directive_return.html",
    "<#return x>"
  ),
  rt: directiveDoc(
    "rt",
    "Right-trim the previous line break.",
    "Whitespace control: removes the previous linebreak.",
    "ref_directive_nt.html",
    "<#rt>"
  ),
  sep: directiveDoc(
    "sep",
    "Separator between `#list` / `#items`.",
    "Printed between items, not after the last.",
    "ref_directive_list.html",
    "<#list xs as x>${x}<#sep>, </#list>"
  ),
  setting: directiveDoc(
    "setting",
    "Set a FreeMarker setting for this template.",
    "Changes locale/number_format/… for the rest of processing (see allowed names).",
    "ref_directive_setting.html",
    '<#setting locale="en_US">'
  ),
  stop: directiveDoc(
    "stop",
    "Abort template processing.",
    "Stops with an optional error message.",
    "ref_directive_stop.html",
    '<#stop "message">'
  ),
  switch: directiveDoc(
    "switch",
    "Multi-way branch.",
    "Uses `#on` (2.3.34+, no fall-through) or `#case` + `#break`, and `#default`.",
    "ref_directive_switch.html",
    "<#switch x>\n  <#on 1, 2>…\n  <#default>…\n</#switch>"
  ),
  t: directiveDoc(
    "t",
    "Trim surrounding whitespace (line).",
    "Whitespace control tag; see manual.",
    "ref_directive_nt.html",
    "<#t>"
  ),
  transform: directiveDoc(
    "transform",
    "Apply a transform.",
    "Legacy/transformative directive form; see manual.",
    "ref_directive_transform.html",
    "<#transform expr>\n  …\n</#transform>"
  ),
  visit: directiveDoc(
    "visit",
    "Visit XML nodes with handlers.",
    "Dispatches to nested handlers by node type/name.",
    "ref_directive_visit.html",
    "<#visit node using handlers>"
  ),
};

function specialVarDoc(
  name: string,
  detail: string,
  body: string,
  usage?: string
): RefDoc {
  const usageLine = usage ?? `.${name}`;
  return {
    detail,
    documentation: [
      `**\`.${name}\`** — ${detail}`,
      "",
      "```ftl",
      usageLine,
      "```",
      "",
      body,
      "",
      `[FreeMarker Manual](${MANUAL}/ref_specvar.html)`,
    ].join("\n"),
  };
}

/** Special variables (`.name`) — keyed by name without the leading dot. */
export const SPECIAL_VAR_REF: Record<string, RefDoc> = {
  args: specialVarDoc(
    "args",
    "All arguments of the current macro/function call.",
    "Only valid inside `#macro` / `#function`. Hash for macros; sequence for functions.",
    ".args"
  ),
  auto_esc: specialVarDoc(
    "auto_esc",
    "Whether auto-escaping is on at this place.",
    "Boolean; reflects output-format auto-escaping (not the deprecated `#escape`).",
    ".auto_esc"
  ),
  caller_template_name: specialVarDoc(
    "caller_template_name",
    "Template name that called the current macro/function.",
    "Empty string if the caller is nameless. Error outside macro/function calls.",
    ".caller_template_name"
  ),
  current_node: specialVarDoc(
    "current_node",
    "The node currently processed by #visit / #recurse.",
    "Only meaningful inside a node handler macro called by `#visit` / `#recurse` (XML processing).",
    ".current_node"
  ),
  current_template_name: specialVarDoc(
    "current_template_name",
    "Name of the template where this reference occurs.",
    "May be missing for on-the-fly templates.",
    ".current_template_name"
  ),
  data_model: specialVarDoc(
    "data_model",
    "Direct access to the data-model hash.",
    "Variables created with `#global` are not visible here.",
    ".data_model"
  ),
  error: specialVarDoc(
    "error",
    "Error message of the failure being recovered.",
    "Only available inside `#recover` (after `#attempt`).",
    "<#recover>\n  ${.error}\n</#attempt>"
  ),
  get_optional_template: specialVarDoc(
    "get_optional_template",
    "Load an optional template without failing if missing.",
    "Method: returns a hash with `exists`, `include`, `import`.",
    ".get_optional_template('maybe.ftl')"
  ),
  globals: specialVarDoc(
    "globals",
    "Globally accessible variables (data-model + `#global`).",
    "`#assign` / `#macro` names are not globals.",
    ".globals"
  ),
  incompatible_improvements: specialVarDoc(
    "incompatible_improvements",
    "Current `incompatible_improvements` setting (string).",
    "Configuration version gate for FreeMarker behavior changes.",
    ".incompatible_improvements"
  ),
  lang: specialVarDoc(
    "lang",
    "Language part of the current locale.",
    "E.g. if `.locale` is `en_US`, then `.lang` is `en`.",
    ".lang"
  ),
  locale: specialVarDoc(
    "locale",
    "Current locale setting as a string.",
    "E.g. `en_US`. See also `.locale_object`.",
    ".locale"
  ),
  locale_object: specialVarDoc(
    "locale_object",
    "Current locale as a `java.util.Locale` object.",
    "Prefer this when passing locale into Java methods.",
    ".locale_object"
  ),
  locals: specialVarDoc(
    "locals",
    "Local variables (`#local` and macro parameters).",
    "Hash of the current local scope.",
    ".locals"
  ),
  main: specialVarDoc(
    "main",
    "Main namespace hash.",
    "Data-model globals are not visible through this hash.",
    ".main"
  ),
  main_template_name: specialVarDoc(
    "main_template_name",
    "Name of the top-level template being processed.",
    "The template for which `Template.process` was called.",
    ".main_template_name"
  ),
  namespace: specialVarDoc(
    "namespace",
    "Current namespace hash.",
    "Data-model globals are not visible through this hash.",
    ".namespace"
  ),
  node: specialVarDoc(
    "node",
    "Current node in visitor/XML processing.",
    "Also known historically as `.current_node`.",
    ".node"
  ),
  now: specialVarDoc(
    "now",
    "Current date-time.",
    "Use `?date` / `?time` / `?datetime` as needed.",
    "${.now}"
  ),
  output_encoding: specialVarDoc(
    "output_encoding",
    "Current output charset name.",
    "Absent if the host did not specify an output charset.",
    ".output_encoding"
  ),
  output_format: specialVarDoc(
    "output_format",
    "Name of the output format at this place.",
    "E.g. `HTML`, `XML`, `plainText`, `undefined`.",
    ".output_format"
  ),
  pass: specialVarDoc(
    "pass",
    "No-op macro (no parameters).",
    "Often used as a no-op node handler in XML processing.",
    "<@.pass />"
  ),
  template_name: specialVarDoc(
    "template_name",
    "Deprecated template name (prefer `current_template_name`).",
    "Confusing under macros/`#nested`; avoid in new code.",
    ".template_name"
  ),
  time_zone: specialVarDoc(
    "time_zone",
    "Current `time_zone` setting (ID string).",
    "E.g. `GMT+01:00` or `America/Los_Angeles`.",
    ".time_zone"
  ),
  url_escaping_charset: specialVarDoc(
    "url_escaping_charset",
    "Charset for URL escaping, if set.",
    "When missing, `?url` may fall back to `.output_encoding`.",
    ".url_escaping_charset"
  ),
  vars: specialVarDoc(
    "vars",
    "Artificial parent hash for top-level variables.",
    "`.vars.foo` equals `foo`; useful for `.vars[dynamicName]`.",
    '.vars["strange name!"]'
  ),
  version: specialVarDoc(
    "version",
    "FreeMarker version string.",
    "E.g. `2.3.32`.",
    ".version"
  ),
};

export function getBuiltinRef(name: string): RefDoc | undefined {
  return BUILTIN_REF[name] ?? BUILTIN_REF[canonicalBuiltin(name)];
}

export function getDirectiveRef(name: string): RefDoc | undefined {
  return DIRECTIVE_REF[name] ?? DIRECTIVE_REF[canonicalDirective(name)];
}

export function getSpecialVarRef(name: string): RefDoc | undefined {
  return SPECIAL_VAR_REF[name] ?? SPECIAL_VAR_REF[canonicalSpecialVar(name)];
}
