# Publishing `ftl-dev.vim` (Vim plugin, Pathogen / Vundle style)

Same distribution model as plugins like [vim-freemarker](https://github.com/andreshazard/vim-freemarker): users **git-clone or Plugin-install** the GitHub repo. No Marketplace, no npm.

**Source of truth:** monorepo [`vim/`](../vim/).  
**User repo:** `https://github.com/DevNathan/ftl-dev.vim` (tree root = contents of `vim/`).

## User install (what README advertises)

```bash
# Pathogen
git clone https://github.com/DevNathan/ftl-dev.vim.git ~/.vim/bundle/ftl-dev.vim
```

```vim
" Vundle
Plugin 'DevNathan/ftl-dev.vim'

" vim-plug
Plug 'DevNathan/ftl-dev.vim'
```

## One-time: create the GitHub repo

GitHub → New repository → `ftl-dev.vim` → public → empty (no README).

```powershell
git remote add vim-publish git@github.com:DevNathan/ftl-dev.vim.git
```

## Sync after version bump

1. Bump [`vim/VERSION`](../vim/VERSION) + [`vim/CHANGELOG.md`](../vim/CHANGELOG.md)
2. Commit on this monorepo
3. Run:

```powershell
.\scripts\sync-vim-repo.ps1 -PushTag
```

Users update with `PluginUpdate` / `PlugUpdate` / `git -C ~/.vim/bundle/ftl-dev.vim pull`.

## Language server

Not part of the Vim plugin publish. See [publishing-language-server.md](publishing-language-server.md).
