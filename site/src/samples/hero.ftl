<#--
  Greets a user by display name.

  @param {string} name display name
  @param [punct="!"] closing mark
  @return greeting text
-->
<#function greet name punct="!">
  <#return "Hello, ${name}${punct}">
</#function>

<#list users as user>
  <#switch user.role>
    <#on "admin">${greet(user.name)} ★
    <#on "guest">${greet("stranger", "?")}
  </#switch>
</#list>
