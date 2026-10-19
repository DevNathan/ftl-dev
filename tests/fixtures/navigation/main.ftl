<#-- navigation fixture: main template -->
<#import "lib.ftl" as lib>
<#include "header.ftl">

<#assign title = "Demo">


<#macro banner text>
  <h1>${text}</h1>
</#macro>

<#function twice n>
  <#list 1..3 as i>
    ${i}
  </#list>

  <#return n * 2>
</#function>

${title}
<#-- Signature Help: caret inside args shows banner(text) / twice(n) -->
<@banner text="Hello"/>
${twice(3)}
${lib.helper()}

<br/>

<h2></h2>

<ol>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ol>

<#-- short form (also ok multiline); expressions highlight inside the tag -->
<#assign
  note = "Text"
>

<#-- indent check: elseif/else align with if; bodies one level deeper -->
<#if note?has_content>
  ${note}
<#elseif title?has_content>
  ${title}
<#else>
  (empty)
</#if>

<#if note?has_content>
  ${note}
<#elseif title?has_content>
  ${title}
<#else>
  (empty)
</#if>

<#list [1,2,3] as i>

</#list>

<#attempt>
  

<#recover>

</#attempt>