<#-- Playground: macros, functions, ftldoc and user-directive calls.
     Look at: macro/function names (method/function colors), parameters,
     ftldoc tags inside comments (@param {type} name, @return, {@code}),
     hover / signature help on calls, named vs positional arguments.
     With strictVariables on: nested loop variables 'n' / 'last' of
     <@repeat …; n, last> are reported as undeclared (validator gap). -->
<#import "lib.ftl" as lib>

<#--
  Render a button.
  @param label Button text.
  @param kind Visual kind; one of {@code primary} or {@code secondary}.
  @param attrs Extra HTML attributes (varargs).
-->
<#macro button label kind="primary" attrs...>
  <button class="btn btn-${kind}"<#list attrs as k, v> ${k}="${v}"</#list>>${label}</button>
</#macro>

<#--
  Repeat the nested body.
  @param times How many times
      the body is rendered (multi-line description).
-->
<#macro repeat times=2>
  <#list 1..times as i>
    <#nested i, i == times>
  </#list>
</#macro>

<#--
  Format a price.
  @param {number} amount Amount in cents.
  @param {string} [currency=EUR] Currency code.
  @return {string} Formatted price, e.g.
      {@code "12.50 EUR"}.
-->
<#function price amount currency="EUR">
  <#local units = amount / 100>
  <#return units?string("0.00") + " " + currency>
</#function>

<#function total values...>
  <#local sum = 0>
  <#list values as v>
    <#local sum = sum + v>
  </#list>
  <#return sum>
</#function>

<@button label="Save"/>
<@button label="Cancel" kind="secondary" id="cancel"/>
<@repeat times=3; n, last>
  <span>${n}<#if last>!</#if></span>
</@repeat>
<@lib.card title="Totals" tone="warn">
  ${price(total(150, 250, 600))} / ${price(999, "USD")}
</@lib.card>
<p>${lib.label("done")}</p>
