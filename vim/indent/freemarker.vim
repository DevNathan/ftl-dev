" ftl-dev — FreeMarker indent (mirrors extension/src/indentRules.ts)
if exists("b:did_indent")
  finish
endif
let b:did_indent = 1

setlocal indentexpr=GetFreemarkerIndent()
setlocal indentkeys=o,O,0<#,0</# ,0[# ,0[/# ,0<@,0</@,!^F

" Block openers + mid-block + capture assign + user macros (angle, last > on line)
let s:inc = '^\s*\%('
      \ . '<#\%(if\|list\|macro\|function\|attempt\|compress\|escape\|noescape\|autoesc\|noautoesc\|transform\|switch\|items\|else\|elseif\|recover\|case\|default\|sep\)\>.*>\s*'
      \ . '\|'
      \ . '\[#\%(if\|list\|macro\|function\|attempt\|compress\|escape\|noescape\|autoesc\|noautoesc\|transform\|switch\|items\|else\|elseif\|recover\|case\|default\|sep\)\>.*\]\s*'
      \ . '\|'
      \ . '<#\%(assign\|local\|global\)\%(\s\+\%([a-zA-Z_]\w*\|"[^"]*"\)\%(\s\+in\s\+[^>]*\)\?\)\?>\s*'
      \ . '\|'
      \ . '\[#\%(assign\|local\|global\)\%(\s\+\%([a-zA-Z_]\w*\|"[^"]*"\)\%(\s\+in\s\+[^]]*\)\?\)\?\]\s*'
      \ . '\|'
      \ . '<@[a-zA-Z_][\w.]*\%(.*\/\s*>\)\@!\%(\s[^>]*\)\?>\s*'
      \ . '\|'
      \ . '\[@[a-zA-Z_][\w.]*\%(.*\/\s*]\)\@!\%(\s[^]]*\)\?\]\s*'
      \ . '\)$'

let s:dec = '^\s*\%('
      \ . '[\[<]#\%(else\|elseif\|recover\|case\|default\|sep\)\>'
      \ . '\|'
      \ . '[\[<]/#\%(if\|list\|macro\|function\|attempt\|compress\|escape\|noescape\|autoesc\|noautoesc\|transform\|switch\|items\|assign\|local\|global\)\>'
      \ . '\|'
      \ . '[\[<]/@[a-zA-Z_][\w.]*\>'
      \ . '\)'

function! GetFreemarkerIndent() abort
  if v:lnum <= 1
    return 0
  endif
  let lnum = prevnonblank(v:lnum - 1)
  if lnum < 1
    return 0
  endif
  let ind = indent(lnum)
  let prev = getline(lnum)
  let cur = getline(v:lnum)

  if cur =~# s:dec
    let ind -= shiftwidth()
  endif
  if prev =~# s:inc
    let ind += shiftwidth()
  endif
  return ind < 0 ? 0 : ind
endfunction
