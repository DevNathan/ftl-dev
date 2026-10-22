<#ftl output_format="HTML" strip_whitespace=true>
<#-- Playground: core directives (angle syntax; see square-syntax.ftl for [#…]).
     Look at: directive keywords, named params (output_format=), `as ns`,
     loop variables, and the <#noparse> body which must stay unhighlighted.
     Known false-positive diagnostics on this valid FTL (extension validator gaps):
     "#list classic form requires 'as'" + "</#items>" (the <#list seq><#items as x> form),
     "</#sep>" (sep with a closing tag), "#else without #if" (<#list>…<#else>),
     "</#noparse> no matching". With strictVariables on: 'notCode' inside noparse. -->
<#setting locale="en_US">
<#setting number_format="0.##">
<#import "lib.ftl" as lib>
<#include "partials/footer.ftl" ignore_missing=true>

<#assign items = ["alpha", "beta", "gamma"]>
<#assign count = items?size>
<#global siteName = "Playground">

<#macro section heading>
  <#local id = heading?lower_case>
  <h2 id="${id}">${heading}</h2>
  <#nested id>
</#macro>

<#-- if / elseif / else -->
<#if count == 0>
  <p>empty</p>
<#elseif count gt 2>
  <p>many</p>
<#else>
  <p>few</p>
</#if>

<#-- list / items / sep / else -->
<#list items>
  <ul>
  <#items as it>
    <li>${it?index}: ${it}<#sep>, </#sep></li>
  </#items>
  </ul>
<#else>
  <p>no items</p>
</#list>

<#list items as it>${it}<#if it?has_next> | </#if></#list>

<#-- switch / case / default -->
<#switch count>
  <#case 1>
    one
    <#break>
  <#case 3>
    three
    <#break>
  <#default>
    other
</#switch>

<#-- attempt / recover -->
<#attempt>
  ${siteName?upper_case}
<#recover>
  fallback
</#attempt>

<#compress>
  <p>   compressed   whitespace   </p>
</#compress>

<#noparse>
  ${notCode} <#if notCode>raw text</#if> "header" items
</#noparse>

<@section heading="Intro"; anchor>
  <a href="#${anchor}">${siteName}</a>
</@section>

<@lib.card title="Imported">
  ${lib.label("text")}
</@lib.card>

<#if count lt 0>
  <#stop "unreachable">
</#if>
