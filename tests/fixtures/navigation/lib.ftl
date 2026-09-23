<#-- imported library -->
<#function helper>
  <#return "from-lib">
</#function>

<#-- Tag.find()['test'] -->

<#if test == "test">

<#elseif test == "test2">

<#else>
  do nothing
</#if>

<#if 1 gt 2>
<#elseif>

  do nothing
<#else>
</#if>

<#assign>
  title = "Hello, World!"
</#assign>

<h1>
  ${title}
</h1>

<#macro note msg>
  ${msg}
</#macro>