<#-- Playground: expressions.
     Look at: numbers, booleans, operators (gt/lt/gte/lte, `>` inside parentheses),
     `??` / `!` defaults, ranges, sequence/hash literals, builtin chains,
     lambdas, and the legacy #{…} numeric interpolation.
     Known false-positive diagnostics on this valid FTL (extension validator gaps):
     "Unclosed directive tag" + "</#list>" for <#list 0..<n …> (the `<` of `..<`).
     With strictVariables on: lambda parameter 'x' is reported as undeclared. -->
<#assign n = 5>
<#assign ratio = 0.75>
<#assign enabled = true>
<#assign nums = [3, 1, 4, 1, 5, 9]>
<#assign scores = { "math": 90, "art": 72 }>
<#assign maybe = scores["music"]!0>

<#if n gt 3 && n lte 10 || !enabled>in range</#if>
<#if (n > 3) && (ratio < 1)>parenthesized comparison</#if>
<#if scores.math?? && scores.music??>both<#else>missing</#if>
<#if nums?seq_contains(9) == true>has nine</#if>

${(n * 2 + 1) % 4} ${-ratio} ${n / 2}
${scores.art!"-"} ${(scores.music)!"none"} ${maybe}

<#list 1..3 as i>${i} </#list>
<#list 0..<n as i>${i} </#list>
<#list n..1 as i>${i} </#list>
<#list 2..*3 as i>${i} </#list>

${nums?sort?reverse?join(", ")}
${nums?filter(x -> x > 1)?map(x -> x * 10)?join(" ")}
${nums?size?string("00")} ${"Mixed Case"?lower_case?cap_first}
${scores?keys?join("/")} ${scores?values?size} ${(nums + [2, 6])?size}
${ratio?string.percent} ${enabled?c} ${enabled?then("on", "off")}

<#-- legacy numeric interpolation -->
#{ratio; m2}
