@echo off
echo === OpenCode ???? ===
echo.

REM ?? JSONC ? JSON
powershell -Command "$content = Get-Content 'C:\Users\pass\.config\opencode\opencode.jsonc' -Raw; $content = $content -replace '//[^\n]*', ''; $content = $content -replace ',\s*([}\]])', '$1'; $content | Set-Content 'C:\Users\pass\.temp\opencode-raw.json' -Encoding UTF8"

REM ???? JSON
powershell -Command "try { Get-Content 'C:\Users\pass\.temp\opencode-raw.json' -Raw | ConvertFrom-Json | ConvertTo-Json -Depth 20 | Set-Content 'C:\Users\pass\.temp\opencode-sync.json' -Encoding UTF8; Write-Host 'JSON ????' -ForegroundColor Green } catch { Write-Host 'JSON ???????????' -ForegroundColor Yellow; Copy-Item 'C:\Users\pass\.temp\opencode-router.json' 'C:\Users\pass\.temp\opencode-sync.json' -Force }"

REM ??????
echo ????????...
scp "C:\Users\pass\.temp\opencode-sync.json" root@192.168.3.100:/etc/opencode/opencode.json

REM ????
echo ????? opencode ??...
ssh router "docker restart opencode"

echo.
echo === ???? ===
pause
