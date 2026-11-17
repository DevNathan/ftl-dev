<#ftl output_format="HTML" auto_esc=true>
<#-- Check syntax colors for the output directives and built-ins.
     Expect no diagnostics. These examples use fixed strings. -->
<#assign text = "Tom & Sam's notes">
<#assign markup = "<em>Draft</em>">

<p>${text}</p>
<p>${markup?esc}</p>
<p>${markup?no_esc}</p>

<#noautoesc>
  ${markup}
  <#autoesc>
    ${markup}
  </#autoesc>
</#noautoesc>

<#outputformat "XML">
  <title>${text}</title>
</#outputformat>

<#noparse>
  <p>${literalPlaceholder} <#if thisIsLiteral></p>
</#noparse>
