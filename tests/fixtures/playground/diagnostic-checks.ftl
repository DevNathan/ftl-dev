<#-- Intentional errors. Open the Problems panel and compare the marked lines. -->

<#-- Unknown parameter on a known directive. -->
<#ftl output_formatt="HTML">

<#-- A list without an item variable needs an items block. -->
<#list [1, 2]>
  missing items block
</#list>

<#-- An empty interpolation. -->
${}
