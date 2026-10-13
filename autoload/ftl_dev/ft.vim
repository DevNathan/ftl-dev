" Helpers to assert ftplugin expectations from tests.

function! ftl_dev#ft#expected_commentstring() abort
  return '<#-- %s -->'
endfunction

function! ftl_dev#ft#expected_suffixesadd() abort
  return '.ftl,.ftlh,.ftlx'
endfunction

function! ftl_dev#ft#match_words_defined() abort
  return exists('b:match_words') && !empty(b:match_words)
endfunction

function! ftl_dev#ft#strip_include_quotes(fname) abort
  return substitute(a:fname, '^[\"'']\|[\"'']$', '', 'g')
endfunction
