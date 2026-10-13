" Vim syntax for FreeMarker (ftl-dev)
"
" Highlighting model (nested, not one blue slab):
"   #assign / #if     → ftlDirKeyword
"   @macro            → ftlUserName
"   var / ob          → ftlIdentifier
"   .now / .log       → ftlMethod   (after a dot)
"   ?string / ?size   → ftlBuiltin
"   "…" / 0-9 / =     → string / number / operator
"
" Vim NFA rules that bit us before:
"   - `\?` is a QUANTIFIER, not literal `?`
"   - `$` is EOL; use start="${" for interpolations
"   - `[\w]` does NOT mean word-class inside []; use [a-zA-Z0-9_] or \w outside []
if exists("b:current_syntax")
  finish
endif

syn case match

syn region ftlComment start=/<#--/ end=/-->/ contains=ftlComment,ftlCommentSquare keepend extend
syn region ftlCommentSquare start=/\[#--/ end=/--]/ contains=ftlComment,ftlCommentSquare keepend extend

let s:dirs = 'assign\|attempt\|autoesc\|break\|case\|compress\|continue\|default\|else\|elseif\|escape\|fallback\|flush\|ftl\|function\|global\|if\|import\|include\|items\|list\|local\|lt\|macro\|nested\|noautoesc\|noescape\|noparse\|nt\|outputformat\|recover\|recurse\|return\|rt\|sep\|setting\|stop\|switch\|t\|transform\|visit'

" --- atoms (no [\w] inside collections) ---
syn match ftlBuiltin /?[a-zA-Z_][a-zA-Z0-9_]*/ contained
syn match ftlMethod /\.[a-zA-Z_][a-zA-Z0-9_]*/ contained
syn match ftlIdentifier /\<[a-zA-Z_][a-zA-Z0-9_]*\>/ contained
syn match ftlNumber /\<[0-9]\+\%(\.[0-9]\+\)\=\>/ contained
syn match ftlOperator /[=<>!+\-*\/%|&]/ contained
syn keyword ftlBoolean true false contained
syn region ftlStringD start=/"/ skip=/\\./ end=/"/ contained
syn region ftlStringS start=/'/ skip=/\\./ end=/'/ contained
exe 'syn match ftlDirKeyword /#\%('.s:dirs.'\)\>/ contained'
syn match ftlDirKeyword /#[a-zA-Z_][a-zA-Z0-9_.]*/ contained
syn match ftlUserName /@[a-zA-Z_][a-zA-Z0-9_.]*/ contained

" Method before Identifier so `.now` wins over bare names
syn cluster ftlExpr contains=ftlStringD,ftlStringS,ftlBuiltin,ftlMethod,ftlIdentifier,ftlNumber,ftlOperator,ftlBoolean

" transparent regions — only contained groups paint
syn region ftlDirective start=/<\/\?#/ end=/\/\?>/ transparent keepend contains=ftlDirKeyword,@ftlExpr
syn region ftlDirectiveSquare start=/\[\/\?#/ end=/\/\?]/ transparent keepend contains=ftlDirKeyword,@ftlExpr
syn region ftlUserDirective start=/<\/\?@/ end=/\/\?>/ transparent keepend contains=ftlUserName,@ftlExpr
syn region ftlUserDirectiveSquare start=/\[\/\?@/ end=/\/\?]/ transparent keepend contains=ftlUserName,@ftlExpr
syn region ftlInterpolation start="${" end="}" transparent keepend contains=@ftlExpr

" High-contrast defaults (distinct hues on purpose)
hi ftlComment ctermfg=244 guifg=#808080
hi ftlCommentSquare ctermfg=244 guifg=#808080
hi ftlDirKeyword ctermfg=39 guifg=#00afff cterm=bold gui=bold
hi ftlUserName ctermfg=45 guifg=#00d7ff cterm=bold gui=bold
hi ftlBuiltin ctermfg=208 guifg=#ff8700 cterm=bold gui=bold
hi ftlMethod ctermfg=177 guifg=#d787ff cterm=bold gui=bold
hi ftlIdentifier ctermfg=255 guifg=#eeeeee
hi ftlNumber ctermfg=212 guifg=#ff87d7
hi ftlOperator ctermfg=228 guifg=#ffff87
hi ftlBoolean ctermfg=141 guifg=#af87ff
hi ftlStringD ctermfg=114 guifg=#87d787
hi ftlStringS ctermfg=114 guifg=#87d787

let b:current_syntax = "freemarker"
