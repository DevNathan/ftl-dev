<#-- Hover the import and include paths to read each target's file documentation.
     Follow the paths and report call with Go to Definition.
     Compare the two declarations of label. Expect no diagnostics. -->
<#import "lib.ftl" as lib>
<#include "../navigation/header.ftl">
<#assign label = "Daily report">

<#macro report totals minimum=1>
  <#local label = lib.label("counted items")>
  <h2>${label}</h2>
  <#list totals as name, count>
    <#if count lt minimum><#continue></#if>
    <p>${name}: ${count}</p>
  <#else>
    <p>No items</p>
  </#list>
</#macro>

<h1>${label}</h1>
<@report totals={"apples": 4, "pears": 0} minimum=1 />
