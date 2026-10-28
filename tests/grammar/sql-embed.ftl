// SYNTAX TEST "text.html.freemarker" "SQL in capture assignments (plan 0041)"
<#assign sqlInsert>
// <-- punctuation.definition.tag.begin.freemarker
//^^^^^^ keyword.control.directive.freemarker
//       ^^^^^^^^^ variable.other.freemarker
INSERT INTO T (a, b) VALUES (@이름, '${x}', 'it''s', 10)
// <------ keyword.other.DML.sql
// <------ meta.embedded.block.sql
//                   ^^^^^^ keyword.other.DML.sql
//                           ^^^ variable.parameter.bind.sql
//                                ^^^^^^ string.quoted.single.sql
//                                 ^^ meta.interpolation.freemarker
//                                           ^^ constant.character.escape.sql
//                                                 ^^ constant.numeric.sql
<#if flag>WHERE a = 1</#if>
//^^ keyword.control.directive.freemarker
//        ^^^^^ keyword.other.DML.sql
</#assign>
// <---------- - meta.embedded.block.sql
// ^^^^^^ keyword.control.directive.freemarker
SELECT after_block
// <------ - keyword.other.DML.sql
<#local SQL_UPPER>select 1</#local>
//                ^^^^^^ keyword.other.DML.sql
//                           ^^^^^^ - meta.embedded.block.sql
<#assign plain>SELECT not_sql</#assign>
//             ^^^^^^ - keyword.other.DML.sql
<#assign sqlOneLine = "SELECT x">
//                     ^^^^^^ string.quoted.double.freemarker - keyword.other.DML.sql
SELECT not_sql_either
// <------ - keyword.other.DML.sql
<#-- @lang sql -->
// <---- comment.block.freemarker
//   ^^^^^ keyword.other.documentation.ftldoc.freemarker
<#assign query>
//       ^^^^^ variable.other.freemarker
UPDATE T SET a = @a WHERE b = 'unterminated
// <------ keyword.other.DML.sql
//               ^^ variable.parameter.bind.sql
</#assign>
// ^^^^^^ keyword.control.directive.freemarker - string
<#assign html>
SELECT stays_text
// <------ - keyword.other.DML.sql
</#assign>
<#-- @lang sql -->

<#assign q2>
select 2
// <------ keyword.other.DML.sql
</#assign>
<#assign after>
select 3
// <------ - keyword.other.DML.sql
</#assign>
<#-- @lang sql -->
<#assign oneLine = 1>
//^^^^^^ keyword.control.directive.freemarker
SELECT no
// <------ - keyword.other.DML.sql
<#assign sqlX>user@example.com and @ok</#assign>
//                ^^^^^^^^ - variable.parameter.bind.sql
//                                 ^^^ variable.parameter.bind.sql
