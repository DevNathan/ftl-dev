// SYNTAX TEST "text.html.freemarker" "string interpolation scopes inside quoted FTL strings (plan 0039)"
<#assign p = "${baseDir}/${name}/data.sql">
//            ^^ meta.interpolation.freemarker punctuation.definition.interpolation.begin.freemarker punctuation.section.embedded.begin.freemarker
//              ^^^^^^^ meta.interpolation.freemarker meta.embedded.line.freemarker variable.other.freemarker
//                     ^ meta.interpolation.freemarker punctuation.definition.interpolation.end.freemarker punctuation.section.embedded.end.freemarker
//                      ^ string.quoted.double.freemarker - meta.interpolation.freemarker
//                       ^^ meta.interpolation.freemarker punctuation.definition.interpolation.begin.freemarker punctuation.section.embedded.begin.freemarker
//                         ^^^^ meta.interpolation.freemarker meta.embedded.line.freemarker variable.other.freemarker
//                             ^ meta.interpolation.freemarker punctuation.definition.interpolation.end.freemarker punctuation.section.embedded.end.freemarker
//                              ^^^^^^^^^ string.quoted.double.freemarker - meta.interpolation.freemarker
<#assign s = '${x}/y'>
//            ^^ meta.interpolation.freemarker punctuation.definition.interpolation.begin.freemarker punctuation.section.embedded.begin.freemarker
//              ^ meta.interpolation.freemarker variable.other.freemarker
//               ^ meta.interpolation.freemarker punctuation.definition.interpolation.end.freemarker punctuation.section.embedded.end.freemarker
//                ^^ string.quoted.single.freemarker - meta.interpolation.freemarker
<#assign e = "\${x}">
//            ^^ string.quoted.double.freemarker constant.character.escape.freemarker
//              ^^^ string.quoted.double.freemarker - meta.interpolation.freemarker
<#assign n = "${outer('${inner}')}">
//            ^^ meta.interpolation.freemarker punctuation.definition.interpolation.begin.freemarker punctuation.section.embedded.begin.freemarker
//              ^^^^^ meta.interpolation.freemarker entity.name.function.freemarker
//                    ^ meta.interpolation.freemarker string.quoted.single.freemarker
//                     ^^ meta.interpolation.freemarker punctuation.definition.interpolation.begin.freemarker punctuation.section.embedded.begin.freemarker
//                       ^^^^^ meta.interpolation.freemarker variable.other.freemarker
//                            ^ meta.interpolation.freemarker punctuation.definition.interpolation.end.freemarker punctuation.section.embedded.end.freemarker
//                               ^ meta.interpolation.freemarker punctuation.definition.interpolation.end.freemarker punctuation.section.embedded.end.freemarker
//                                ^ string.quoted.double.freemarker - meta.interpolation.freemarker
<#assign s = "안녕 ${cfg.env["test"]} 입니다.">
//            ^^^ string.quoted.double.freemarker - meta.interpolation.freemarker
//               ^^ meta.interpolation.freemarker punctuation.definition.interpolation.begin.freemarker punctuation.section.embedded.begin.freemarker
//                 ^^^ meta.interpolation.freemarker variable.other.object.freemarker
//                     ^^^ meta.interpolation.freemarker variable.other.property.freemarker
//                         ^^^^^^ meta.interpolation.freemarker string.quoted.double.freemarker
//                                ^ meta.interpolation.freemarker punctuation.definition.interpolation.end.freemarker punctuation.section.embedded.end.freemarker
//                                 ^^^^^ string.quoted.double.freemarker - meta.interpolation.freemarker
<#return {
//       ^ meta.directive.freemarker - string
    "header": header
//  ^^^^^^^^ meta.directive.freemarker string.quoted.double.freemarker
//            ^^^^^^ meta.directive.freemarker variable.other.freemarker - string
} />
//^^ punctuation.definition.tag.end.freemarker
<#assign q = r"${x}" + r'${y}' + other>
//             ^^^^ string.quoted.double.raw.freemarker - meta.interpolation.freemarker
//                       ^^^^ string.quoted.single.raw.freemarker - meta.interpolation.freemarker
//                               ^^^^^ variable.other.freemarker - string
<#assign w = for"x">
//           ^^^ variable.other.freemarker - string
//              ^^^ string.quoted.double.freemarker - string.quoted.double.raw.freemarker
