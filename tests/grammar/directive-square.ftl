// SYNTAX TEST "text.html.freemarker" "square-bracket directive"
[#list items as item]
//<-- punctuation.definition.tag.begin.freemarker
//^^^^ keyword.control.directive.freemarker
[/#list]
//<-- punctuation.definition.tag.begin.freemarker
//     ^ punctuation.definition.tag.end.freemarker
[#assign items = [["alpha"]]]
//               ^^ - punctuation.definition.tag.begin.freemarker
//                        ^^ - punctuation.definition.tag.end.freemarker
//                          ^ punctuation.definition.tag.end.freemarker
[@badge text=items[0][0]?upper_case/]
//<-- punctuation.definition.tag.begin.freemarker
//                ^ - punctuation.definition.tag.begin.freemarker
//                  ^ - punctuation.definition.tag.end.freemarker
//                   ^ - punctuation.definition.tag.begin.freemarker
//                     ^ - punctuation.definition.tag.end.freemarker
//                       ^ support.function.builtin.freemarker
//                                 ^^ punctuation.definition.tag.end.freemarker
