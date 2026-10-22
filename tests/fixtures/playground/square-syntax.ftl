[#ftl]
[#-- Playground: square-bracket tag syntax (FreeMarker picks one syntax per file).
     Look at: [#…] / [/#…] / [@…] tags colored like their angle forms,
     [#-- comments --] muted, ${…} interpolation unchanged.
     Known false-positive diagnostic: "[/#sep]" no matching (sep with a closing tag). --]
[#import "lib.ftl" as lib]
[#assign items = ["alpha", "beta"]]
[#assign count = items?size + 1]

[#if count gt 1]
  [#list items as sq]${sq}[#sep]; [/#sep][/#list]
[#else]
  none
[/#if]

[#macro badge text tone="info"]
  <span class="badge badge-${tone}">${text}</span>
[/#macro]

[@badge text="new"/]
[@lib.card title="Square"]${lib.label("body")}[/@lib.card]
