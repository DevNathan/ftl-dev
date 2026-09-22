# Plan: FTL-aware auto-indent

- Status: completed
- Started: 2026-09-22
- Completed: 2026-09-22

## Goal

Control FreeMarker indentation so:

1. Bodies inside `#if` / `#list` / `#macro` / … indent.
2. Mid-block siblings (`#elseif`, `#else`, `#recover`, `#case`, `#default`) align with the opener — **not** deeper.
3. Closing tags (`</#…>`, `</@…>`) align with their opener (including when auto-closed via `</`).

## Done when

- [x] `language-configuration.json` increase/decrease/onEnter rules match the policy above
- [x] Auto-close `</` rewrites line indent to match the open tag
- [x] Unit tests for indent pattern classification + close-indent
- [x] Docs note / plan closed when verified in editor

## Where

- Patterns: [`extension/src/indentRules.ts`](../../../extension/src/indentRules.ts)
- Config: [`extension/language-configuration.json`](../../../extension/language-configuration.json)
- Close-indent: [`extension/src/closeTag.ts`](../../../extension/src/closeTag.ts)

## Out of scope

Full formatter (Format Document); HTML tag indent parity beyond what TextMate/HTML embed already does.
