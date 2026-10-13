" Pure indent helpers (unit-tested). Used by indent/freemarker.vim.

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

function! ftl_dev#indent#increases(line) abort
  return a:line =~# s:inc
endfunction

function! ftl_dev#indent#decreases(line) abort
  return a:line =~# s:dec
endfunction

" Compute indent for line lnum (1-based) given buffer lines as a List (0-based).
" Mirrors GetFreemarkerIndent without depending on v:lnum / getline.
function! ftl_dev#indent#compute(lnum, lines, shiftwidth) abort
  if a:lnum <= 1
    return 0
  endif
  let prev_lnum = a:lnum - 1
  while prev_lnum >= 1
    let text = get(a:lines, prev_lnum - 1, '')
    if text =~# '\S'
      break
    endif
    let prev_lnum -= 1
  endwhile
  if prev_lnum < 1
    return 0
  endif
  let prev = a:lines[prev_lnum - 1]
  let cur = get(a:lines, a:lnum - 1, '')
  let ind = match(prev, '\S')
  if ind < 0
    let ind = 0
  endif
  if ftl_dev#indent#decreases(cur)
    let ind -= a:shiftwidth
  endif
  if ftl_dev#indent#increases(prev)
    let ind += a:shiftwidth
  endif
  return ind < 0 ? 0 : ind
endfunction
