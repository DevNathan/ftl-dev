<#-- Sample fixture for Extension Development Host (F5). -->
<#assign user = {"name": "Ada", "role": "admin"}>
<#assign service = javaBean>

<#if user.role == "admin">
  ${user.name}
  ${service.getStatus()}
  
<#elseif user.role == "guest">
  guest
<#else>
  other
</#if>

<#function greet name>
  <#return "Hello, " + name>
</#function>

${greet(user.name)}

[#if flag]
  square-bracket syntax
[/#if]


<#assign boo = user["name"]??>
${boo?c}

<#assign foo = ""?has_content?then("foo", "bar")>

<#if boo>
  <#elseif>

</#if>

<#assign />

<h1></h1>


