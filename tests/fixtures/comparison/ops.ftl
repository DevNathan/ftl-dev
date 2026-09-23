<#-- Comparison operator presentation fixture (F5): lt/lte/gt/gte should display as </<=/>/>= -->
<#assign n = 5>

<#if n gte 3>
  gte branch
<#elseif n lte 1>
  lte branch
<#elseif n gt 10>
  gt branch
<#elseif n lt 0>
  lt branch
<#else>
  else
</#if>

<p>Result: ${n gte 3?then("yes", "no")}</p>

<#-- Must NOT restyle whitespace trim directive -->
<#lt>

[#if n gte 1]
  square form
[/#if]
