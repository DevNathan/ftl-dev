" ftl-dev — FreeMarker filetype plugin (editor-local UX; no comparison decorations)
if exists("b:did_ftplugin")
  finish
endif
let b:did_ftplugin = 1

setlocal commentstring=<#--\ %s\ -->
setlocal comments=s:<#--,e:-->
setlocal matchpairs+=<:>

" matchit: FTL block pairs (HTML tags still via html matchit if loaded)
if exists("loaded_matchit")
  let b:match_words =
        \ '<#if\>:<#elseif\>:<#else\>:</#if>,' .
        \ '<#list\>:<#items\>:<#sep\>:</#list>,' .
        \ '<#attempt\>:<#recover\>:</#attempt>,' .
        \ '<#macro\>:</#macro>,' .
        \ '<#function\>:</#function>,' .
        \ '<#compress\>:</#compress>,' .
        \ '<#switch\>:<#case\>:<#default\>:</#switch>,' .
        \ '\[#if\]:\[#elseif\]:\[#else\]:\[/#if\],' .
        \ '\[#list\]:\[/#list\],' .
        \ '\[#attempt\]:\[#recover\]:\[/#attempt\],' .
        \ '\[#macro\]:\[/#macro\],' .
        \ '\[#function\]:\[/#function\]'
endif

" Auto-close ${ → }
inoremap <buffer> ${ ${}<Left>

" Simple directive close hint: after typing </#  use omni / LSP; keep lightweight
" gf for quoted include/import paths on the line
setlocal include=\\v\\[#<]#\\s*(include\|import)\\s+[\"']
setlocal includeexpr=ftl_dev#ft#strip_include_quotes(v:fname)
setlocal suffixesadd=.ftl,.ftlh,.ftlx

let b:undo_ftplugin =
      \ "setlocal commentstring< comments< matchpairs< include< includeexpr< suffixesadd<"
      \ . " | unlet! b:match_words"
