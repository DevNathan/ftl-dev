// SYNTAX TEST "text.html.freemarker" "directive named-param attribute names"
<#ftl encoding="UTF-8">
//    ^^^^^^^^ entity.other.attribute-name.freemarker
<#setting locale="en_US">
//        ^^^^^^ entity.other.attribute-name.freemarker
<#include "a.ftl" parse=true>
//                ^^^^^ entity.other.attribute-name.freemarker
<#ftl outputFormat="HTML">
//    ^^^^^^^^^^^^ entity.other.attribute-name.freemarker
<#include "b.ftl" ignoreMissing=true>
//                ^^^^^^^^^^^^^ entity.other.attribute-name.freemarker
<#if x == 1>
//   ^ - entity.other.attribute-name.freemarker
</#if>
