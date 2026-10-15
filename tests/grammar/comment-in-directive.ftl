// SYNTAX TEST "text.html.freemarker" "FTL comments inside directive / interpolation tags"
<#assign x = [ {"a":1}, <#-- 테스트코드 -->
//              ^^^ meta.directive.freemarker string.quoted.double.freemarker
//                      ^^^^ comment.block.freemarker punctuation.definition.comment.begin.freemarker
//                           ^^^^^ meta.directive.freemarker comment.block.freemarker
//                                 ^^^ comment.block.freemarker punctuation.definition.comment.end.freemarker
  {"b": "two"} ] />
// ^^^ meta.directive.freemarker string.quoted.double.freemarker
//      ^^^^^ meta.directive.freemarker string.quoted.double.freemarker
//               ^^ punctuation.definition.tag.end.freemarker
<p>after</p>
// ^^^^^ text.html.freemarker - comment.block.freemarker
// ^^^^^ text.html.freemarker - meta.directive.freemarker
[#if x [#-- c --] ]
//     ^^^^ comment.block.freemarker punctuation.definition.comment.begin.freemarker
//          ^ meta.directive.freemarker comment.block.freemarker
//            ^^^ comment.block.freemarker punctuation.definition.comment.end.freemarker
//                ^ meta.directive.freemarker punctuation.definition.tag.end.freemarker
[/#if]<p>after</p>
//       ^^^^^ text.html.freemarker - comment.block.freemarker
//       ^^^^^ text.html.freemarker - meta.directive.freemarker
<@m a=1 <#-- c --> />
//      ^^^^ comment.block.freemarker punctuation.definition.comment.begin.freemarker
//             ^^^ comment.block.freemarker punctuation.definition.comment.end.freemarker
//                 ^^ meta.directive.user.freemarker punctuation.definition.tag.end.freemarker
<p>after</p>
// ^^^^^ text.html.freemarker - comment.block.freemarker
// ^^^^^ text.html.freemarker - meta.directive.user.freemarker
[@m a=1 [#-- c --] /]
//      ^^^^ comment.block.freemarker punctuation.definition.comment.begin.freemarker
//             ^^^ comment.block.freemarker punctuation.definition.comment.end.freemarker
//                 ^^ meta.directive.user.freemarker punctuation.definition.tag.end.freemarker
<p>after</p>
// ^^^^^ text.html.freemarker - comment.block.freemarker
// ^^^^^ text.html.freemarker - meta.directive.user.freemarker
<#list xs <#-- c --> as x>
//        ^^^^ comment.block.freemarker punctuation.definition.comment.begin.freemarker
//               ^^^ comment.block.freemarker punctuation.definition.comment.end.freemarker
//                   ^^ meta.directive.freemarker variable.other.freemarker
//                       ^ meta.directive.freemarker punctuation.definition.tag.end.freemarker
</#list>
// ^^^^ keyword.control.directive.freemarker
${ a <#-- c --> + b }
//   ^^^^ comment.block.freemarker punctuation.definition.comment.begin.freemarker
//          ^^^ comment.block.freemarker punctuation.definition.comment.end.freemarker
//                ^ meta.interpolation.freemarker variable.other.freemarker
//                  ^ meta.interpolation.freemarker punctuation.definition.interpolation.end.freemarker
<p>after</p>
// ^^^^^ text.html.freemarker - comment.block.freemarker
// ^^^^^ text.html.freemarker - meta.interpolation.freemarker
