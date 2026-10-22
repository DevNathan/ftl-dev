<#-- Playground: small library imported as `lib` by the other playground files.
     Look at: ns.member semantic colors (`lib.card`, `lib.label`) where it is used. -->

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
