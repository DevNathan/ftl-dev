// SYNTAX TEST "text.html.freemarker" "FTL comments mute brackets and tags"
<#-- arr[0] {k} (c) -->
// <------------------- comment.block.freemarker
//       ^ comment.block.freemarker - meta.directive.freemarker
//            ^ comment.block.freemarker - meta.directive.freemarker
//                ^ comment.block.freemarker - meta.directive.freemarker
<#-- ${x} <#if> -->
// <--------------- comment.block.freemarker
//   ^ comment.block.freemarker - meta.interpolation.freemarker
//        ^ comment.block.freemarker - keyword.control.directive.freemarker
[#-- [1] {2} --]
// <------------ comment.block.freemarker
//    ^ comment.block.freemarker - meta.directive.freemarker
//       ^ comment.block.freemarker - meta.directive.freemarker
