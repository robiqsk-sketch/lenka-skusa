# Nasadenie appky na GitHub Pages.
# Obsah priecinka robiq-app/ sa posle do verejneho repa robiqsk-sketch/robiq-app (vetva main),
# z ktoreho GitHub Pages servuje https://robiqsk-sketch.github.io/robiq-app/
#
# Spustit z korena repa:  powershell -ExecutionPolicy Bypass -File deploy.ps1

$ErrorActionPreference = 'Stop'
$git = "$env:LOCALAPPDATA\GitHubDesktop\app-3.6.4\resources\app\git\cmd\git.exe"
if (-not (Test-Path $git)) { $git = 'git' }

$status = & $git status --porcelain
if ($status) { Write-Host "Najprv commitni zmeny (pracovny strom nie je cisty)." -ForegroundColor Red; exit 1 }

Write-Host "Vytvaram snapshot priecinka robiq-app/ ..." -ForegroundColor Cyan
& $git branch -D deploy 2>$null | Out-Null
& $git subtree split --prefix robiq-app -b deploy | Out-Null

Write-Host "Pushujem na robiqsk-sketch/robiq-app ..." -ForegroundColor Cyan
& $git push --force https://github.com/robiqsk-sketch/robiq-app.git deploy:main
& $git branch -D deploy | Out-Null

Write-Host "Hotovo. O minutu-dve bude nova verzia na https://robiqsk-sketch.github.io/robiq-app/" -ForegroundColor Green
