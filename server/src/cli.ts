#!/usr/bin/env node
/**
 * ftl-dev language server entry (stdio).
 * Clients: Neovim (nvim-lspconfig), Vim (vim-lsp / coc.nvim), future VS Code.
 */
import { createConnection, ProposedFeatures } from "vscode-languageserver/node";
import { startFtlLanguageServer } from "./server";

const connection = createConnection(ProposedFeatures.all);
startFtlLanguageServer(connection);
connection.listen();
