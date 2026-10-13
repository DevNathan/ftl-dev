" Vim syntax for FreeMarker (ftl-dev)
" FTL-first: do NOT runtime html.vim as a base — HTML tag rules steal `<#…>` and
" split colours mid-name (e.g. `<#a` vs `ssign`). Markup can still be plain text.
if exists("b:current_syntax")
  finish
endif

syn case match

" Nested FTL comments
syn region ftlComment start=/<#--/ end=/-->/ contains=ftlComment,ftlCommentSquare keepend extend
syn region ftlCommentSquare start=/\[#--/ end=/--]/ contains=ftlComment,ftlCommentSquare keepend extend

let s:dirs = 'assign\|attempt\|autoesc\|break\|case\|compress\|continue\|default\|else\|elseif\|escape\|fallback\|flush\|ftl\|function\|global\|if\|import\|include\|items\|list\|local\|lt\|macro\|nested\|noautoesc\|noescape\|noparse\|nt\|outputformat\|recover\|recurse\|return\|rt\|sep\|setting\|stop\|switch\|t\|transform\|visit'

" Whole open token `<#name` / `[#name` is one group (no matchgroup split).
exe 'syn region ftlDirective start=/<\/\?#\%('.s:dirs.'\)\>/ end=/\/\?>/ contains=@ftlExpr keepend'
exe 'syn region ftlDirectiveSquare start=/\[\/\?#\%('.s:dirs.'\)\>/ end=/\/\?\]/ contains=@ftlExpr keepend'
exe 'syn region ftlDirectiveUnknown start=/<\/\?#[a-zA-Z_][\w.]*/ end=/\/\?>/ contains=@ftlExpr keepend'
exe 'syn region ftlDirectiveSquareUnknown start=/\[\/\?#[a-zA-Z_][\w.]*/ end=/\/\?\]/ contains=@ftlExpr keepend'
syn region ftlUserDirective start=/<\/\?@[a-zA-Z_][\w.]*/ end=/\/\?>/ contains=@ftlExpr keepend
syn region ftlUserDirectiveSquare start=/\[\/\?@[a-zA-Z_][\w.]*/ end=/\/\?\]/ contains=@ftlExpr keepend

syn region ftlInterpolation start=/\${/ end=/}/ contains=@ftlExpr keepend

syn match ftlBuiltin /\?[a-zA-Z_][\w]*/ contained
syn match ftlIdentifier /\<[a-zA-Z_][\w.]*\>/ contained
syn match ftlNumber /\<\d\+\%(\.\d\+\)\?\>/ contained
syn match ftlOperator /[=<>!+\-*\/%|&]/ contained
syn keyword ftlBoolean true false contained
syn region ftlStringD start=/"/ skip=/\\./ end=/"/ contained
syn region ftlStringS start=/'/ skip=/\\./ end=/'/ contained

syn cluster ftlExpr contains=ftlStringD,ftlStringS,ftlBuiltin,ftlIdentifier,ftlNumber,ftlOperator,ftlBoolean

" Explicit colours (cterm 256 + guifg). Colorschemes may override via :hi.
" Vim is not limited to 16 colours when 'termguicolors' or 256-color term is on.
hi def ftlComment ctermfg=244 guifg=#808080
hi def ftlCommentSquare ctermfg=244 guifg=#808080
hi def ftlDirective ctermfg=39 guifg=#00afff cterm=bold gui=bold
hi def ftlDirectiveSquare ctermfg=39 guifg=#00afff cterm=bold gui=bold
hi def ftlDirectiveUnknown ctermfg=39 guifg=#00afff
hi def ftlDirectiveSquareUnknown ctermfg=39 guifg=#00afff
hi def ftlUserDirective ctermfg=45 guifg=#00d7ff cterm=bold gui=bold
hi def ftlUserDirectiveSquare ctermfg=45 guifg=#00d7ff cterm=bold gui=bold
hi def ftlInterpolation ctermfg=219 guifg=#ffafff
hi def ftlBuiltin ctermfg=214 guifg=#ffaf00 cterm=bold gui=bold
hi def ftlIdentifier ctermfg=252 guifg=#d0d0d0
hi def ftlNumber ctermfg=176 guifg=#d787d7
hi def ftlOperator ctermfg=186 guifg=#d7d787
hi def ftlBoolean ctermfg=141 guifg=#af87ff
hi def ftlStringD ctermfg=114 guifg=#87d787
hi def ftlStringS ctermfg=114 guifg=#87d787

let b:current_syntax = "freemarker"
