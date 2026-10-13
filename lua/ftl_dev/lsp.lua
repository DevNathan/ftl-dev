-- Optional Neovim helper: start the ftl-dev language server for freemarker buffers.
-- The language server lives in the ftl-dev monorepo (server/), not in this plugin.
--
--   require("ftl_dev.lsp").setup({
--     cmd = { "node", "/path/to/ftl-dev/server/out/server/src/cli.js", "--stdio" },
--   })

local M = {}

function M.setup(opts)
  opts = opts or {}
  local cmd = opts.cmd
  if type(cmd) ~= "table" or #cmd == 0 then
    vim.notify(
      "ftl_dev.lsp: pass opts.cmd = { \"node\", \"…/server/out/server/src/cli.js\", \"--stdio\" }",
      vim.log.levels.ERROR
    )
    return
  end

  vim.api.nvim_create_autocmd("FileType", {
    pattern = "freemarker",
    callback = function(ev)
      vim.lsp.start({
        name = "ftl-dev",
        cmd = cmd,
        root_dir = vim.fs.dirname(vim.api.nvim_buf_get_name(ev.buf)),
      })
    end,
  })
end

return M
