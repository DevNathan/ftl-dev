// SYNTAX TEST "text.html.freemarker" "HTML tags embed with FTL"
<h1 class="title">${title}</h1>
// <~-- entity.name.tag.html
//                 ^ meta.interpolation.freemarker
<div>
// <--- meta.tag.structure.any.html
<#if flag>
//^^ keyword.control.directive.freemarker
</div>
