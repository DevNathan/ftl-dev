" Headless smoke: fail CI if sourcing syntax emits NFA/arg errors.
" Usage (from vim/): vim -Nu test/vimrc -S test/syntax_smoke.vim
set nocompatible
let &runtimepath = expand('<sfile>:p:h:h') . ',' . &runtimepath
filetype plugin indent on
syntax enable

new
call setline(1, ['<#assign x = y?size/>', '${x}', '<#--c-->'])
let v:errmsg = ''
redir => s:msgs
silent! setfiletype freemarker
redir END

if b:current_syntax !=# 'freemarker'
  echom 'FAIL: b:current_syntax=' . get(b:, 'current_syntax', '?')
  cquit 1
endif
if s:msgs =~# 'E866\|E475\|E28\|Error detected'
  echom 'FAIL: syntax load errors:'
  echom s:msgs
  cquit 1
endif
if v:errmsg !=# ''
  echom 'FAIL: v:errmsg=' . v:errmsg
  cquit 1
endif
echom 'syntax_smoke OK'
qa!
