[#ftl]
[#-- Playground: square-bracket tag syntax (FreeMarker picks one syntax per file).
     Look at: [#…] / [/#…] / [@…] tags colored like their angle forms,
     Tag brackets should match the color of angle tag delimiters in directives.ftl.
     The brackets in the sequence and index below should retain bracket pair colors.
     [#-- comments --] muted, ${…} interpolation unchanged.
     Expect no diagnostics (plan 0040). --]
[#import "lib.ftl" as lib]
[#assign items = ["alpha", "beta"]]
[#assign first = items[0]?upper_case]
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
[@badge text=first/]
[@lib.card title="Square"]${lib.label("body")}[/@lib.card]
