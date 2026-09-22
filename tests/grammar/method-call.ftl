// SYNTAX TEST "text.html.freemarker" "method call on object"
${service.getStatus()}
//^^ variable.other.object.freemarker
//       ^ punctuation.accessor.freemarker
//        ^^^^^^^^^ entity.name.function.freemarker
