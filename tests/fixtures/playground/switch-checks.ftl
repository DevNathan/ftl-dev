<#-- Playground: #switch checks. This file is MEANT to show diagnostics:
     - warning on '#case 1' (falls through into '#case 2' without #break)
     - error on '<#case 3>' in the second switch (mixes #on and #case)
     No diagnostics on the grouped / terminated / marked branches. -->
<#assign count = 2>

<#switch count>
  <#case 1>
    one
  <#case 2>
    two
    <#break>
  <#case 4>
  <#case 5>
    four or five (grouped, empty #case 4 is fine)
    <#break>
  <#case 6>
    six <#-- falls through -->
  <#default>
    other
</#switch>

<#switch count>
  <#on 1, 2>
    one or two
  <#case 3>
    three
</#switch>
