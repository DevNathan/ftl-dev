# ftldoc examples

## An imported macro library

`lib/cards.ftlh`

```ftl
<#--
  @file Renders status badges for account pages.
  @exports `badge label tone="info"` renders one badge.
  @usage Import this file and pass the badge label at the call site.
  @example
    <#import "lib/cards.ftlh" as cards>
    <@cards.badge label="New" tone="info" />
-->

<#--
  Renders a badge with the given label and CSS tone.
  @param {string} label Visible badge text.
  @param {string} [tone=info] CSS modifier suffix.
-->
<#macro badge label tone="info">
  <span class="badge badge-${tone}">${label}</span>
</#macro>
```

In a caller that imports this path, Hover on `lib/cards.ftlh` shows the file summary, Exports, Usage, and Example. Hover on `cards.badge` shows the macro summary and Parameters.

## An included fragment in square-bracket syntax

`partials/account-header.ftlh`

```ftl
[#ftl output_format="HTML"]
[#--
  @file Renders the account heading.
  @requires `account.displayName` in the template data model.
  @usage Include this fragment where the page heading belongs.
  @example [#include "partials/account-header.ftlh"]
--]
<h1>${account.displayName}</h1>
```

The file comment follows the `[#ftl]` header. Use Hover on the path in `[#include "partials/account-header.ftlh"]` to see the file's data requirement.

## A function with a structured input and return value

```ftl
<#--
  Chooses a display label for a user.
  @param {hash} user User record.
  @param {string} user.displayName Preferred label, when present.
  @param {string} [fallback=Guest] Label to use when the name is missing.
  @return {string} The display name or the fallback.
  @example ${displayLabel({}, "Anonymous")}
-->
<#function displayLabel user fallback="Guest">
  <#return (user.displayName)!fallback>
</#function>
```

Completion and Hover can show the declaration documentation. In a call, Signature Help uses the declaration for the parameter list and displays the descriptions for the active parameter. The dotted `user.displayName` entry is under `user`.

## Display rules and common mistakes

- A file description needs a leading `@file`. An ordinary top comment can attach to an adjacent declaration, but will not appear on a file path. A leading `@file` comment never doubles as documentation for the first declaration.
- `@nodoc` suppresses the comment it starts. The word appearing later in the prose does not suppress the comment. A leading `@ignore` is only a custom tag. Neither tag changes symbol visibility.
- `@return` and `@returns` are equivalent. A single-line leading `{hash}` is a type label. A multiline body beginning with a brace can show a return shape in a code block. Document the actual fields.
- `{@code item}` is a code span. `{@link https://example.com Guide}` creates a URL link. `{@link helper}` displays the symbol name as code; it does not navigate to a definition. `@see` can contain descriptions or inline links.
- Unknown block tags display under their literal heading, such as `@processing`. Prefer the built-in tags for contracts they already express. ftl-dev does not interpret custom tags as directives, validation rules, or visibility controls.
- By default, duplicate `@param` entries and names that do not match a macro or function parameter produce Information diagnostics. A dotted entry must have a declared root. These checks do not require a tag for every parameter. Fix stale documentation first. `ftl-dev.ftldoc.validateParams` controls the editor check.
