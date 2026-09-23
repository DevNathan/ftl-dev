// SYNTAX TEST "text.html.freemarker" "FTL comments stay comment-scoped"
<#-- Tag.find()['test'] -->
// <----------------------- comment.block.freemarker
//     ^ comment.block.freemarker
//                  ^ comment.block.freemarker
[#-- square.find()['x'] --]
// <----------------------- comment.block.freemarker
//     ^ comment.block.freemarker
