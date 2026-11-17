<#--
  @file Reusable cards and labels for the playground templates.
  @exports `card(title, tone)` renders the card. `label(text)` formats its label.
  @usage Import this template under a namespace to call its macro and function.
  @example
    <#import "lib.ftl" as lib>
    <@lib.card title="Summary">${lib.label("draft")}</@lib.card>
-->

<#--
  Render a bordered card.
  @param title Card title.
  @param tone Visual tone (`info`, `warn`).
-->
<#macro card title tone="info">
  <div class="card card-${tone}">
    <h3>${title}</h3>
    <#nested>
  </div>
</#macro>

<#--
  Build a display label.
  @param text Raw text.
  @return {string} Upper-cased label.
-->
<#function label text>
  <#return text?trim?upper_case>
</#function>
