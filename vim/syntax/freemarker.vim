" Vim syntax for FreeMarker (ftl-dev)
" Parity focus: nested comments, angle/square directives, interpolations, HTML embed.
" TextMate source of truth for VS Code: extension/syntaxes/freemarker.tmLanguage.json
if exists("b:current_syntax")
  finish
endif

" HTML as base where available
runtime! syntax/html.vim
unlet! b:current_syntax

syn case match

" Nested FTL comments (<#-- … <#-- … --> … -->)
syn region ftlComment start=/<#--/ end=/-->/ contains=ftlComment,ftlCommentSquare keepend extend
syn region ftlCommentSquare start=/\[#--/ end=/--]/ contains=ftlComment,ftlCommentSquare keepend extend

" Built-in directive names
let s:dirs = 'assign\|attempt\|autoesc\|break\|case\|compress\|continue\|default\|else\|elseif\|escape\|fallback\|flush\|ftl\|function\|global\|if\|import\|include\|items\|list\|local\|lt\|macro\|nested\|noautoesc\|noescape\|noparse\|nt\|outputformat\|recover\|recurse\|return\|rt\|sep\|setting\|stop\|switch\|t\|transform\|visit'

" Angle directives <#…> / </#…>
exe 'syn region ftlDirective matchgroup=ftlDelimiter start=/<\/\?#\%('.s:dirs.'\)\>/ end=/\/\?>/ contains=ftlStringD,ftlStringS,ftlBuiltin,ftlIdentifier,ftlNumber,ftlOperator keepend'
exe 'syn region ftlDirectiveUnknown matchgroup=ftlDelimiter start=/<\/\?#[a-zA-Z_][\w.]*/ end=/\/\?>/ contains=ftlStringD,ftlStringS,ftlBuiltin,ftlIdentifier,ftlNumber,ftlOperator keepend'
syn region ftlUserDirective matchgroup=ftlDelimiter start=/<\/\?@[a-zA-Z_][\w.]*/ end=/\/\?>/ contains=ftlStringD,ftlStringS,ftlBuiltin,ftlIdentifier,ftlNumber,ftlOperator keepend

" Square directives [#…] / [/#…]
exe 'syn region ftlDirectiveSquare matchgroup=ftlDelimiter start=/\[\/\?#\%('.s:dirs.'\)\>/ end=/\/\?\]/ contains=ftlStringD,ftlStringS,ftlBuiltin,ftlIdentifier,ftlNumber,ftlOperator keepend'
exe 'syn region ftlDirectiveSquareUnknown matchgroup=ftlDelimiter start=/\[\/\?#[a-zA-Z_][\w.]*/ end=/\/\?\]/ contains=ftlStringD,ftlStringS,ftlBuiltin,ftlIdentifier,ftlNumber,ftlOperator keepend'
syn region ftlUserDirectiveSquare matchgroup=ftlDelimiter start=/\[\/\?@[a-zA-Z_][\w.]*/ end=/\/\?\]/ contains=ftlStringD,ftlStringS,ftlBuiltin,ftlIdentifier,ftlNumber,ftlOperator keepend

" Interpolation ${…}
syn region ftlInterpolation matchgroup=ftlDelimiter start=/\${/ end=/}/ contains=ftlStringD,ftlStringS,ftlBuiltin,ftlIdentifier,ftlNumber,ftlOperator keepend

syn match ftlBuiltin /?[a-zA-Z_][\w]*/ contained
syn match ftlIdentifier /\<[a-zA-Z_][\w.]*\>/ contained
syn match ftlNumber /\<\d\+\%(\.\d\+\)\?\>/ contained
syn match ftlOperator /[=<>!+\-*\/%|&]/ contained
syn region ftlStringD start=/"/ skip=/\\./ end=/"/ contained
syn region ftlStringS start=/'/ skip=/\\./ end=/'/ contained

" Highlight links
hi def link ftlComment Comment
hi def link ftlCommentSquare Comment
hi def link ftlDelimiter Delimiter
hi def link ftlDirective Statement
hi def link ftlDirectiveSquare Statement
hi def link ftlDirectiveUnknown Identifier
hi def link ftlDirectiveSquareUnknown Identifier
hi def link ftlUserDirective Function
hi def link ftlUserDirectiveSquare Function
hi def link ftlInterpolation Special
hi def link ftlBuiltin PreProc
hi def link ftlIdentifier Identifier
hi def link ftlNumber Number
hi def link ftlOperator Operator
hi def link ftlStringD String
hi def link ftlStringS String

let b:current_syntax = "freemarker"
