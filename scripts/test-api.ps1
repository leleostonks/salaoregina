# SalonHub API Tests
# Usage: powershell -File scripts/test-api.ps1

$Base = "http://192.168.15.5:3001"
$Api  = "$Base/api"
$passed = 0
$failed = 0
$login = $null

function Test-Case($name, $scriptBlock) {
  try {
    & $scriptBlock
    Write-Host "[OK] $name" -ForegroundColor Green
    $script:passed++
  } catch {
    Write-Host "[FAIL] $name - $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
  }
}

Write-Host ""
Write-Host "=== SalonHub API Tests ===" -ForegroundColor Cyan
Write-Host ""

Test-Case "Health check" {
  $r = Invoke-RestMethod -Uri "$Base/health" -TimeoutSec 5
  if ($r.status -ne "ok") { throw "status not ok" }
}

Test-Case "Login" {
  $script:login = Invoke-RestMethod -Uri "$Api/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"riana@gmail.com","password":"123456"}'
  if (-not $script:login.token) { throw "no token" }
}

Test-Case "Auth me" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  $me = Invoke-RestMethod -Uri "$Api/auth/me" -Headers $h
  if ($me.email -ne "riana@gmail.com") { throw "wrong email" }
}

Test-Case "Dashboard overview" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  $d = Invoke-RestMethod -Uri "$Api/dashboard/overview" -Headers $h
  if ($null -eq $d.revenue) { throw "no revenue" }
}

Test-Case "Profissionais" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  $p = Invoke-RestMethod -Uri "$Api/professionals" -Headers $h
  if ($p.Count -lt 1) { throw "empty list" }
}

Test-Case "Servicos" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  $s = Invoke-RestMethod -Uri "$Api/services" -Headers $h
  if ($s.Count -lt 1) { throw "empty list" }
}

Test-Case "Clientes" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  $c = Invoke-RestMethod -Uri "$Api/clients" -Headers $h
  if ($c.Count -lt 1) { throw "empty list" }
}

Test-Case "Atendimentos" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  $a = Invoke-RestMethod -Uri "$Api/appointments" -Headers $h
  if ($a.Count -lt 1) { throw "empty list" }
}

Test-Case "Despesas" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  $e = Invoke-RestMethod -Uri "$Api/expenses/summary" -Headers $h
  if ($null -eq $e.pending) { throw "no summary" }
}

Test-Case "Metas" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  Invoke-RestMethod -Uri "$Api/goals/progress" -Headers $h | Out-Null
}

Test-Case "Revenue chart" {
  $h = @{ Authorization = "Bearer $($script:login.token)" }
  $ch = Invoke-RestMethod -Uri "$Api/dashboard/revenue-chart?days=7" -Headers $h
  if ($ch.Count -lt 1) { throw "empty chart" }
}

Write-Host ""
Write-Host "=== Resultado: $passed passou, $failed falhou ===" -ForegroundColor Cyan
Write-Host ""
if ($failed -gt 0) { exit 1 }
