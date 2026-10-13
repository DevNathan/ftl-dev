# Sync monorepo vim/ -> remote ftl-dev.vim (plugin-manager installable root).
# Prerequisites:
#   git remote add vim-publish https://github.com/DevNathan/ftl-dev.vim.git
# Usage:
#   .\scripts\sync-vim-repo.ps1
#   .\scripts\sync-vim-repo.ps1 -PushTag
#   .\scripts\sync-vim-repo.ps1 -PushTag -Force

param(
  [switch]$PushTag,
  [switch]$Force,
  [string]$Remote = "vim-publish",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$verFile = Join-Path $root "vim\VERSION"
if (-not (Test-Path $verFile)) {
  throw "Missing vim/VERSION"
}
$version = (Get-Content $verFile -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+') {
  throw "vim/VERSION must be semver X.Y.Z, got: $version"
}

$remotes = git remote
if ($remotes -notcontains $Remote) {
  throw "Remote '$Remote' not found. Run: git remote add $Remote https://github.com/DevNathan/ftl-dev.vim.git"
}

$splitBranch = "vim-publish-split"
Write-Host "Splitting prefix=vim -> $splitBranch ..."
git branch -D $splitBranch 2>$null | Out-Null
# git writes "not found" to stderr when branch is absent; ignore that
$global:LASTEXITCODE = 0
git subtree split --prefix=vim -b $splitBranch
if ($LASTEXITCODE -ne 0) {
  throw "git subtree split failed"
}

if ($Force) {
  Write-Host "Pushing $splitBranch -> ${Remote}/${Branch} (force-with-lease) ..."
  git push --force-with-lease $Remote "${splitBranch}:${Branch}"
} else {
  Write-Host "Pushing $splitBranch -> ${Remote}/${Branch} ..."
  git push $Remote "${splitBranch}:${Branch}"
}
if ($LASTEXITCODE -ne 0) {
  throw "git push failed (create empty repo on GitHub first, or pass -Force)"
}

if ($PushTag) {
  $tag = "v$version"
  Write-Host "Tagging $tag on $splitBranch and pushing to $Remote ..."
  git tag -d $tag 2>$null | Out-Null
  git tag -a $tag -m $tag $splitBranch
  git push $Remote "refs/tags/$tag"
  if ($LASTEXITCODE -ne 0) {
    throw "tag push failed"
  }
  Write-Host "Monorepo already has vim-$tag if you tagged earlier."
}

Write-Host "Done. Install: Plugin 'DevNathan/ftl-dev.vim' (version $version)"
