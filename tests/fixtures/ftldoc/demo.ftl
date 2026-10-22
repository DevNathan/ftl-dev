<#--
  ftldoc manual fixture — open with ftl-dev loaded, then Hover
  (mouse or Ctrl+K Ctrl+I) on the names marked below.

  Tip: put free-text / lists ABOVE @tags (JavaDoc style). Typing `.` in
  comments should not open completions.
-->

<#--
  Greets a user by name.

  @param name display name
  @return greeting string
  @since 0.1.0
  @see https://freemarker.apache.org/
-->
<#function say name>
  <#return "hi ${name}">
</#function>

<#--
  Renders a page banner.

  Features:
  1. numbered item
  2. another item

  - unordered
  - list

  @param text heading text
  @return heading markup
  @see say
  @since 1.0.0
  @deprecated prefer plain ${say(...)} for text-only greetings
-->
<#macro banner text>
  <h1>${text}</h1>
</#macro>

<#--
  Requires a value or stops the template (FreeMarker `#stop`, not throw).

  @param x required value
  @return x unchanged
  @stop if x is missing / null
  @see https://freemarker.apache.org/docs/ref_directive_stop.html
-->
<#function require x>
  <#if !x??>
    <#stop "missing x">
  </#if>
  <#return x>
</#function>

<#-- Site title shown in the header -->
<#assign title = "ftl-dev ftldoc demo" />

<#--
@nodoc
Throwaway: side-effect call only — Hover on `r` must NOT show this comment.
-->
<#assign r = say("side-effect") />

<#--
  Local-only scratch inside `scopedDemo`.

  Hover on `tmp` inside this function → doc visible.
  Hover on `tmp` in "OUTSIDE" below → must NOT resolve to this #local.
-->
<#function scopedDemo>
  <#-- Accumulator for the local demo -->
  <#local tmp = 1>
  <#return tmp + 1>
</#function>

<#--
  Old helper — prefer `say`.

  @deprecated use say instead
  @param x ignored
-->
<#function legacy x>
  <#return x>
</#function>

<#--
    Parses the request payload and its header.
    Some fields may be empty hashes depending on the header.

@param payload
    raw request data
@param header
    mapped header data; may contain a route key,
    then a target key depending on routing

@return {
    status: ...,
    items: ...,
    ...
}

@processing
    1. read the header
    2. map the payload

@note
    remark text
-->
<#function parseRequest payload header>
  <#return {"status": "ok", "items": []}>
</#function>

<#--
  Stray @param on purpose (Information squiggle on `missing`).

  @param missing not a parameter
-->
<#function strayParam a>
  <#return a>
</#function>

<html>
<body>
  <p>${title}</p>
  <#-- Hover `say` / `banner` / `require` / `title` / `legacy` -->
  <p>${say("Ada")}</p>
  <@banner text="Hello ftldoc"/>
  <p>${require("ok")}</p>
  <#-- Expect warning on `legacy` (@deprecated) -->
  <p>${legacy("old")}</p>
  <p>${scopedDemo()}</p>
  <#-- Hover / Signature Help / Ctrl+Space on `parseRequest` -->
  <p>${parseRequest("p", "h").status}</p>
  <p>${strayParam(1)}</p>

  <#-- OUTSIDE scopedDemo: Hover `tmp` should not pick up the #local doc -->
  <p>outside: tmp is not in scope here</p>

  <#-- Hover `r`: only `r — assign` (no @nodoc body) -->
  <p>discarded: ${r}</p>
</body>
</html>
