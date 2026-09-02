# encoding-audit.ps1 - UTF-8 encoding audit & BOM cleanup
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File encoding-audit.ps1 -CheckOnly
#   powershell -NoProfile -ExecutionPolicy Bypass -File encoding-audit.ps1          # check + strip BOM
#   powershell -NoProfile -ExecutionPolicy Bypass -File encoding-audit.ps1 -Root "C:\path" -Pattern "*.md"
# NOTE: keep this file ASCII-only (PS 5.1 reads scripts as ANSI/GBK by default)

param(
  [string]$Root = "C:\Users\pass\.config\opencode",
  [string]$Pattern = "*.md,*.json,*.jsonc,*.ts,*.txt,*.sh,*.ps1,*.yaml,*.yml",
  [switch]$CheckOnly
)

$excludeRegex = "\\node_modules\\|\\\.git\\|\\\.superpowers\\|\\skills\.backup\\|\\\.learnings\.backup\\|\\\.learnings-archived|\\\.playwright-mcp\\|\\chub-zh\\|\\cyoa\\|\\rpg\\|\\data\\|\\temp\\|\\temp_scripts\\|\\projects\\|\\tools\\|\\backups\\|\\\.opencode\\"

$issues = @()
$fixed = @()

function Test-Utf8Strict($bytes) {
  try {
    $u = New-Object System.Text.UTF8Encoding($false, $true)
    $null = $u.GetString($bytes)
    return $true
  } catch {
    return $false
  }
}

$extSet = $Pattern -split "," | ForEach-Object { $_.Trim().TrimStart("*", ".") } | Where-Object { $_ }

$files = Get-ChildItem $Root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch $excludeRegex -and
    ($extSet -contains $_.Extension.TrimStart("."))
  }

foreach ($f in $files) {
  try {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
  } catch { continue }

  $hasBom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF

  if (-not (Test-Utf8Strict $bytes)) {
    $issues += [PSCustomObject]@{ File = $f.FullName.Replace("$Root\", ""); Issue = "INVALID UTF-8" }
    continue
  }

  if ($hasBom) {
    $rel = $f.FullName.Replace("$Root\", "")
    if ($CheckOnly) {
      $issues += [PSCustomObject]@{ File = $rel; Issue = "HAS BOM" }
    } else {
      $body = $bytes[3..($bytes.Length - 1)]
      [System.IO.File]::WriteAllBytes($f.FullName, $body)
      $fixed += [PSCustomObject]@{ File = $rel; Issue = "BOM stripped" }
    }
  }
}

echo "=== Results ==="
$issues | Format-Table -AutoSize | Out-String -Width 160
$fixed  | Format-Table -AutoSize | Out-String -Width 160
echo "INVALID: $($issues.Count)  BOM_STRIPPED: $($fixed.Count)"
