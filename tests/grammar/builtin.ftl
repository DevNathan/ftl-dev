// SYNTAX TEST "text.html.freemarker" "built-in ?c and chained"
${boo?c}
//   ^ punctuation.accessor.builtin.freemarker
//    ^ support.function.builtin.freemarker
${name?trim?upper_case}
//    ^ punctuation.accessor.builtin.freemarker
//     ^^^^ support.function.builtin.freemarker
//         ^ punctuation.accessor.builtin.freemarker
//          ^^^^^^^^^^ support.function.builtin.freemarker
<#assign x = user.name??>
//                    ^^ keyword.operator.existential.freemarker
