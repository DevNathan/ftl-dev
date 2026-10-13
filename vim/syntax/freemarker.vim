" Vim syntax for FreeMarker (ftl-dev)
"
" Highlighting model (nested, not one blue slab):
"   #assign / #if     → ftlDirKeyword
"   @macro            → ftlUserName
"   var / m1          → ftlIdentifier
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

" Link to colorscheme groups — NEVER hardcode near-white guifg/ctermfg.
" Absolute #eeeeee / ctermfg=255 vanishes on light terminal themes.
hi def link ftlComment Comment
hi def link ftlCommentSquare Comment
hi def link ftlDirKeyword Statement
hi def link ftlUserName Type
hi def link ftlBuiltin Special
hi def link ftlMethod Function
hi def link ftlIdentifier Identifier
hi def link ftlNumber Number
hi def link ftlOperator Operator
hi def link ftlBoolean Boolean
hi def link ftlStringD String
hi def link ftlStringS String

let b:current_syntax = "freemarker"
