/**
 * Signature Help param labels for arg-taking FreeMarker built-ins.
 * Expanded beyond plan 0028 practical subset (plan 0032b) — paraphrased labels,
 * not Java / Apache overload dumps. Names absent here (incl. zero-arg builtins)
 * → no Signature Help. CamelCase aliases resolve to snake_case entries.
 */

import { canonicalBuiltin } from "./reference/aliases";

export type BuiltinSignature = {
  parameters: readonly string[];
  documentation?: string;
};

export const BUILTIN_SIGNATURES: Readonly<
  Record<string, BuiltinSignature>
> = {
  contains: { parameters: ["substring"] },
  date: { parameters: ["pattern?"] },
  datetime: { parameters: ["pattern?"] },
  time: { parameters: ["pattern?"] },
  default: { parameters: ["fallback"] },
  ends_with: { parameters: ["suffix"] },
  ensure_ends_with: { parameters: ["suffix"] },
  ensure_starts_with: {
    parameters: ["prefixOrPattern", "prefixIfMissing?", "flags?"],
  },
  filter: { parameters: ["condition"] },
  index_of: { parameters: ["substring", "start?"] },
  join: { parameters: ["separator"] },
  keep_after: { parameters: ["separator"] },
  keep_after_last: { parameters: ["separator"] },
  keep_before: { parameters: ["separator"] },
  keep_before_last: { parameters: ["separator"] },
  last_index_of: { parameters: ["substring", "start?"] },
  left_pad: { parameters: ["width", "filling?"] },
  map: { parameters: ["mapper"] },
  matches: { parameters: ["pattern", "flags?"] },
  max: { parameters: ["others…"] },
  min: { parameters: ["others…"] },
  new: { parameters: ["constructorArg…"] },
  number: { parameters: ["format?"] },
  remove_beginning: { parameters: ["prefix"] },
  remove_ending: { parameters: ["suffix"] },
  replace: { parameters: ["string", "replacement", "flags?"] },
  right_pad: { parameters: ["width", "filling?"] },
  seq_contains: { parameters: ["value"] },
  seq_index_of: { parameters: ["value", "start?"] },
  seq_last_index_of: { parameters: ["value", "start?"] },
  sort_by: { parameters: ["key"] },
  split: { parameters: ["separator", "flags?"] },
  starts_with: { parameters: ["prefix"] },
  string: { parameters: ["formatOrWhenTrue?", "whenFalse?"] },
  substring: { parameters: ["from", "toExclusive?"] },
  switch: { parameters: ["case1", "result1", "…", "default?"] },
  then: { parameters: ["whenTrue", "whenFalse"] },
  truncate: {
    parameters: ["maxLength", "terminator?", "terminatorLength?"],
  },
  url: { parameters: ["charset?"] },
  absolute_template_name: { parameters: ["baseName?"] },
  ancestors: { parameters: ["nodeName…"] },
  chunk: { parameters: ["size", "filler?"] },
  dedent: { parameters: ["prefix?", "rightTrim?"] },
  drop_while: { parameters: ["predicate"] },
  indent: { parameters: ["prefix", "rightTrim?"] },
  iso: { parameters: ["timeZone"] },
  iso_h: { parameters: ["timeZone"] },
  iso_h_nz: { parameters: ["timeZone"] },
  iso_m: { parameters: ["timeZone"] },
  iso_m_nz: { parameters: ["timeZone"] },
  iso_ms: { parameters: ["timeZone"] },
  iso_ms_nz: { parameters: ["timeZone"] },
  iso_nz: { parameters: ["timeZone"] },
  item_cycle: { parameters: ["value…"] },
  take_while: { parameters: ["predicate"] },
  truncate_c: { parameters: ["maxLength", "terminator?", "terminatorLength?"] },
  truncate_c_m: { parameters: ["maxLength", "terminator?", "terminatorLength?"] },
  truncate_m: { parameters: ["maxLength", "terminator?", "terminatorLength?"] },
  truncate_w: { parameters: ["maxLength", "terminator?", "terminatorLength?"] },
  truncate_w_m: { parameters: ["maxLength", "terminator?", "terminatorLength?"] },
  url_path: { parameters: ["charset?"] },
  wrap: { parameters: ["width", "firstLinePrefix?", "otherLinesPrefix?"] },
};

/** FreeMarker 2.3.23+ camelCase → snake_case for catalog lookup. */
export function camelToSnakeBuiltin(name: string): string {
  return name.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
}

export function formatBuiltinSignatureLabel(
  name: string,
  parameters: readonly string[]
): string {
  return `${name}(${parameters.join(", ")})`;
}

export function builtinSignatureOf(
  name: string
): BuiltinSignature | undefined {
  const direct = BUILTIN_SIGNATURES[name];
  if (direct) {
    return direct;
  }
  if (!name.includes("_") && /[A-Z]/.test(name)) {
    return (
      BUILTIN_SIGNATURES[canonicalBuiltin(name)] ??
      BUILTIN_SIGNATURES[camelToSnakeBuiltin(name)]
    );
  }
  return undefined;
}
