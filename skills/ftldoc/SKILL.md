---
name: ftldoc
description: Write, review, and troubleshoot ftldoc comments for the ftl-dev FreeMarker extension. Use for file documentation on import and include paths, declaration comments, hover text, parameter and return documentation, examples, and ftldoc diagnostics. Use ftl-writing for changes to template logic.
---

# Document FreeMarker with ftldoc

## Choose what to document

- Read the target template, the declarations, and representative call sites. Describe the contract the code actually implements: required data, defaults, rendered output or return values, and side effects that matter to callers.
- Use a file comment for what someone needs to know when choosing to import or include the template. Use declaration comments for individual macros, functions, and variables. Keep routine implementation details near the relevant code.
- Use real FTL comments, `<#-- … -->` or `[#-- … --]`, matching the template's tag syntax. Preserve template behavior and existing output configuration when adding documentation.

## Document a file

Put one closed comment at the top of the target file. If the file starts with a `#ftl` header, put the comment immediately after it. Apart from whitespace, it must be the first thing after that header, or the first thing in a file without one.

Start the comment body with `@file` as its first nonblank line. Put the summary after `@file` on that line or on the next line. Use these tags when they help a caller:

- `@requires` for data model values and dependencies the caller must supply.
- `@exports` for supported public macros, functions, or values. Match their actual names and signatures.
- `@usage` for how and when to import or include the file.
- `@example` for a short FTL call. Use `@note`, `@see`, or `@since` when there is something concrete to add.

Put the comment in the file being referenced. ftl-dev reads it when hovering the path itself in a literal `#import` or `#include`. Hovering an imported member shows that member's declaration documentation.

## Document a declaration

- Place the comment immediately above the `#macro`, `#function`, `#assign`, `#local`, or `#global` it describes. Leave only whitespace between the comment and declaration. A standalone `@lang sql` marker may sit between them and should remain in its own comment.
- Start with a summary before any block tags. Use `@param {type} name description` with the exact declared name. Use `[name]` or `[name=default]` only when the signature allows omission, and keep the documented default in sync. For a hash parameter, use `options.theme` to describe a property under the declared root `options`.
- Use `@return {type} description` for a function's returned value. Describe a macro's rendered output or nested body in the summary, `@usage`, or `@example`. Use `@stop` for a condition that actually invokes `#stop`. Add `@deprecated` only if the declaration is deprecated and name the replacement when there is one.
- Start each block tag on its own line. Continuation lines belong to that tag until the next tag. Place sample FTL under `@example`; ftl-dev renders it as code. Use `{@code name}` for inline code and `{@literal @name}` when a line should start with a literal at sign.
- Use a leading `@nodoc` only to suppress that comment's documentation. It does not hide the declaration. Custom tags render as text sections. Types in braces describe the contract and do not add type checking.

## Check what the caller sees

In ftl-dev, hover the import or include path for file docs. For declaration docs, check Hover at a use and, where relevant, Completion and Signature Help. If a comment is missing, check placement, the leading marker, the referenced file, and whether the path is a literal. If a parameter is flagged, compare the exact root name and check for duplicate entries before changing settings. Use [worked examples and display rules](references/examples.md) when writing a new comment or debugging its output.
