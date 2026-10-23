// SYNTAX TEST "text.html.freemarker" "built-in directive keywords"
<#import "x.ftl" as x>
//^^^^^^ keyword.control.directive.freemarker
<#include "h.ftl">
//^^^^^^^ keyword.control.directive.freemarker
<#assign title = "t">
//^^^^^^ keyword.control.directive.freemarker
<#macro banner text>
//^^^^^ keyword.control.directive.freemarker
</#macro>
// ^^^^^ keyword.control.directive.freemarker
<#switch n>
//^^^^^^ keyword.control.directive.freemarker
<#on 1, 2>
//^^ keyword.control.directive.freemarker
<#default>
</#switch>
<#outputFormat "HTML">
//^^^^^^^^^^^^ keyword.control.directive.freemarker
</#outputFormat>
<#foreach i in [1]>
//^^^^^^^ keyword.control.directive.freemarker
</#foreach>
