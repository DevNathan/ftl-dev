<#-- Playground: FTL mixed with HTML.
     Look at: ${…} in HTML attributes, <#if> inside a tag's attribute list,
     FTL inside <script>/<style>, and the difference between an FTL comment
     (muted, never output) and an HTML comment (output as HTML, and its
     ${…} is still evaluated). Note: an FTL comment ends at the first
     "-- >" (written here with a space), so never put an HTML comment inside one. -->
<#assign title = "Playground">
<#assign active = true>
<#assign color = "#336699">
<#assign links = [{ "href": "/a", "text": "A" }, { "href": "/b", "text": "B" }]>
<!DOCTYPE html>
<html lang="en">
<head>
  <title>${title}</title>
  <style>
    .brand { color: ${color}; }
  </style>
  <script>
    const config = { title: "${title?js_string}", active: ${active?c} };
  </script>
</head>
<body class="page<#if active> page-active</#if>">
  <!-- HTML comment: ${title} is still evaluated by FreeMarker -->
  <#-- FTL comment: ${title} is never evaluated -->
  <nav>
    <#list links as link>
      <a href="${link.href}" title="Go to ${link.text}"<#if link?is_first> class="first"</#if>>${link.text}</a>
    </#list>
  </nav>
  <input type="checkbox" <#if active>checked</#if> data-title='${title}'>
  <p>title and color in this sentence are plain HTML text.</p>
</body>
</html>
