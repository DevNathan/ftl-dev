-- coverage: lua.lsp.setup_requires_cmd
-- coverage: lua.lsp.setup_ok
-- Run: nvim --headless -u NONE -c "set rtp+=vim" -c "luafile vim/test/lua/lsp_test.lua" -c "qa!"

local failures = 0
local function assert_true(cond, msg)
  if not cond then
    failures = failures + 1
    io.stderr:write("FAIL: " .. msg .. "\n")
  end
end

-- Minimal rtp so require works when invoked from repo root or vim/
local here = debug.getinfo(1, "S").source:sub(2)
local vim_root = here:match("(.+)/test/lua/") or here:match("(.+)\\test\\lua\\")
if vim_root then
  vim.opt.rtp:prepend(vim_root)
end

local lsp = require("ftl_dev.lsp")

local notified = {}
vim.notify = function(msg, level)
  table.insert(notified, { msg = msg, level = level })
end

notified = {}
lsp.setup({})
assert_true(#notified == 1, "setup without cmd should notify")
assert_true(notified[1].msg:find("opts.cmd", 1, true) ~= nil, "notify mentions opts.cmd")

notified = {}
local started = {}
vim.lsp = vim.lsp or {}
vim.lsp.start = function(cfg)
  table.insert(started, cfg)
  return 1
end
vim.api.nvim_create_autocmd = function(_, opts)
  -- immediately invoke callback as if FileType fired
  opts.callback({ buf = 0 })
end
vim.fs = vim.fs or {}
vim.fs.dirname = function(p)
  return p
end
vim.api.nvim_buf_get_name = function()
  return "/tmp/x.ftl"
end

lsp.setup({ cmd = { "ftl-dev-ls", "--stdio" } })
assert_true(#notified == 0, "setup with cmd should not error-notify")
assert_true(#started == 1, "vim.lsp.start should be called")
assert_true(started[1].name == "ftl-dev", "lsp name")
assert_true(started[1].cmd[1] == "ftl-dev-ls", "lsp cmd")

if failures > 0 then
  io.stderr:write(failures .. " lua assertion(s) failed\n")
  vim.cmd("cquit 1")
else
  io.stderr:write("lua lsp tests passed\n")
end
