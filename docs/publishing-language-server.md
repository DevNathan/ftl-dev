# Language server (monorepo only)

The Vim plugin ([`ftl-dev.vim`](https://github.com/DevNathan/ftl-dev.vim)) is a separate git repo distributed like other Vim plugins (**Pathogen / Vundle / vim-plug**). There is **no npm registry publish** for the language server.

[`server/`](../server/) remains in this monorepo for:

- Local / contributor builds (`cd server && npm install && npm run compile`)
- A future option to wire VS Code to the same process

End users of **ftl-dev.vim** do not need Node, npm, or this package. Syntax and indent work after a normal Vim plugin install.
