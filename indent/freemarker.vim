" ftl-dev — FreeMarker indent (mirrors extension/src/indentRules.ts)
if exists("b:did_indent")
  finish
endif
let b:did_indent = 1

setlocal indentexpr=GetFreemarkerIndent()
" Keep keys simple: `[` / `<#` in indentkeys break :set on Vim 8.1 (E518).
setlocal indentkeys=o,O,!^F

function! GetFreemarkerIndent() abort
  let lines = getline(1, '$')
  return ftl_dev#indent#compute(v:lnum, lines, shiftwidth())
endfunction
