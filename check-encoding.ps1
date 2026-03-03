# ============================================================
# check-encoding.ps1
# Run this anytime to check for mojibake (encoding corruption)
# in your TypeScript/TSX source files.
#
# Usage:
#   .\check-encoding.ps1
#
# Place this file in your project root (smart-attendance/)
# ============================================================

$patterns = @("à¤", "à¥", "Ã", "â€")
$includePaths = @("frontend/src", "backend/src")
$extensions = @("*.ts", "*.tsx")

$found = @()

foreach ($path in $includePaths) {
    if (Test-Path $path) {
        foreach ($ext in $extensions) {
            $files = Get-ChildItem -Recurse -Path $path -Include $ext
            foreach ($file in $files) {
                foreach ($pattern in $patterns) {
                    $matches = Select-String -Path $file.FullName -Pattern $pattern
                    if ($matches) {
                        $found += $matches
                    }
                }
            }
        }
    }
}

if ($found.Count -gt 0) {
    Write-Host ""
    Write-Host "MOJIBAKE DETECTED — encoding corruption found in the following files:" -ForegroundColor Red
    Write-Host ""
    $found | ForEach-Object {
        Write-Host "  $($_.Filename) (line $($_.LineNumber)): $($_.Line.Trim())" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Fix: open the file in VS Code, check bottom-right encoding shows UTF-8." -ForegroundColor Cyan
    Write-Host "     Then re-paste the correct Nepali text or pull from i18n.ts." -ForegroundColor Cyan
    Write-Host ""
    exit 1
} else {
    Write-Host ""
    Write-Host "All clean — no encoding issues found." -ForegroundColor Green
    Write-Host ""
    exit 0
}