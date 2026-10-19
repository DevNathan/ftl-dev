// SYNTAX TEST "text.html.freemarker" "ftldoc tags inside FTL comments"
<#-- @param foo description -->
//   ^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
//          ^^^ comment.block.freemarker variable.parameter.ftldoc.freemarker
<#--
  @ignore something
//^^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
  @return value
//^^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
  @returns value
//^^^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
  @deprecated reason
//^^^^^^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
  @see say
//^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
  @since 1.0
//^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
  @stop if missing
//^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
-->
<#-- @IGNORE @Returns @Param bar -->
//   ^^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
//           ^^^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
//                    ^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
//                           ^^^ comment.block.freemarker variable.parameter.ftldoc.freemarker
[#-- @param x y --]
//   ^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
//          ^ comment.block.freemarker variable.parameter.ftldoc.freemarker
[#-- @deprecated --]
//   ^^^^^^^^^^^ comment.block.freemarker keyword.other.documentation.ftldoc.freemarker
<#-- user@host not a tag -->
//       ^ comment.block.freemarker - keyword.other.documentation.ftldoc.freemarker
<#-- outer <#-- inner --> still -->
// <-------------------------------- comment.block.freemarker
//           ^ comment.block.freemarker
