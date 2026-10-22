<#-- Playground: string literals (plan 0039).
     Look at:
     - plain text in string color; escapes (\" \n \{ \\) in escape color
     - `${` / `}` inside strings in the embedded-punctuation color, the body as code
       (variables, nested strings in string color)
     - raw strings r"…" / r'…' stay plain string: no escapes, no ${…} highlight
     - hash keys equal to local variable names stay string-colored
     With strictVariables on: the `r` prefix of raw strings is reported as an
     undeclared identifier (validator gap). -->
<#import "lib.ftl" as lib>

<#assign cfg = { "env": { "test": "staging", "prod": "live" } }>
<#assign user = { "name": "Ada", "roles": ["admin", "dev"] }>
<#assign baseDir = "/srv/app">
<#assign name = "report">

<#-- Plain strings and escapes -->
<#assign quoted = "She said \"hi\"\nand left.">
<#assign single = 'It\'s fine'>
<#assign braces = "literal \{ brace, $\{notInterpolated} and a \\ backslash">

<#-- Raw strings: no escapes, no interpolation -->
<#assign rawDouble = r"C:\temp\${notCode}">
<#assign rawSingle = r'${alsoNotCode} \n'>

<#-- Interpolation inside strings -->
<#assign path = "${baseDir}/${name}/data.sql">
<#assign greeting = "안녕 ${cfg.env['test']} 입니다.">
<#assign keyed = "env=${cfg.env[ 'prod' ]}">
<#assign shout = "Hello ${user.name?upper_case}!">
<#assign joined = 'roles: ${user.roles?join(", ")}'>
<#assign called = "Label: ${lib.label(' ${name} ')}">
<#assign nested = "outer ${'inner ${name?length} chars'} done">

<#-- Concatenation -->
<#assign concat = "a" + name + 'b' + "${baseDir}" + r"\raw">

<#-- Hash keys equal to local names (the 0039 bug case) -->
<#function build rawHeader request>
  <#local header = rawHeader?trim>
  <#local body = header + ":" + request>
  <#return {
      "header": header,
      "request": request,
      "body": body
  } />
</#function>

<#assign built = build("h", "r")>
<p>${built.header} / ${built["request"]} / ${built.body}</p>
<p>${path} ${greeting} ${keyed} ${shout} ${joined} ${called} ${nested}</p>
<p>${quoted} ${single} ${braces} ${rawDouble} ${rawSingle} ${concat}</p>
<p>header and request here are plain HTML text, not variables.</p>
