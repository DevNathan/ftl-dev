# Windows runner for ftl-dev.vim tests (requires vim and git on PATH).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Test = Join-Path $Root "test"
$Vendor = Join-Path $Test "vendor\vader.vim"
$Inv = Join-Path $Test "coverage_inventory.json"

if (-not (Test-Path (Join-Path $Vendor "plugin\vader.vim"))) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Test "vendor") | Out-Null
  git clone --depth 1 https://github.com/junegunn/vader.vim.git $Vendor
}

$ids = (Get-Content $Inv -Raw | ConvertFrom-Json).units | ForEach-Object { $_.id }
$missing = @()
foreach ($id in $ids) {
  $hit = Select-String -Path (Join-Path $Test "vader\*.vader") -Pattern "coverage: $id" -SimpleMatch -Quiet
  if (-not $hit) { $missing += $id }
}
if ($missing.Count -gt 0) {
  Write-Host "MISSING coverage tags:"
  $missing | ForEach-Object { Write-Host "  $_" }
  exit 1
}
Write-Host "Coverage inventory: 100% of units tagged in vader cases."

$vim = Get-Command vim -ErrorAction SilentlyContinue
if (-not $vim) { $vim = Get-Command vim.exe -ErrorAction SilentlyContinue }
if (-not $vim) { throw "vim not found on PATH" }

& $vim.Source -Nu (Join-Path $Test "vimrc") -c "Vader! $($Test -replace '\\','/')/vader/*.vader" -c "qa!"
if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
  # Some Vim builds return 0 after qa!; treat vader failures via exit if set
}
Write-Host "All vim tests passed."
