# Apenas passo Neon (se o assistente completo parou no passo 2)
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

Write-Host ""
Write-Host "CONFIGURAR NEON - Facil Analytics" -ForegroundColor Cyan
Write-Host "No Neon: Connect -> Connection string -> Pooled" -ForegroundColor Gray
Write-Host ""

$dbUrl = $null
for ($i = 1; $i -le 5; $i++) {
    $entrada = Read-Host "DATABASE_URL (Neon)"
    $dbUrl = $entrada.Trim().Trim('"').Trim("'")
    if ($dbUrl -match "^postgres(ql)?://") { break }
    Write-Host "URL invalida. Cole postgresql://usuario:senha@host/..." -ForegroundColor Red
    $dbUrl = $null
}
if (-not $dbUrl) { exit 1 }

if ($dbUrl -notmatch "sslmode") {
    if ($dbUrl -match "\?") { $dbUrl = "$dbUrl&sslmode=require" } else { $dbUrl = "$dbUrl?sslmode=require" }
}

$env:DATABASE_URL = $dbUrl
Write-Host "Criando tabelas..." -ForegroundColor Gray
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) { exit 1 }
npm run db:seed-perfis 2>&1 | Out-Null

$envFile = Join-Path $raiz ".env.vercel"
$template = Join-Path $raiz ".env.vercel.template"
if (-not (Test-Path $envFile) -and (Test-Path $template)) { Copy-Item $template $envFile }
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    $content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=$dbUrl"
    Set-Content -Path $envFile -Value $content -Encoding UTF8
    Write-Host "DATABASE_URL salva em .env.vercel" -ForegroundColor Green
}

Write-Host "Neon OK. Continue com PUBLICAR-FACIL-ANALYTICS.bat (passo 4+) ou CHECKLIST-PUBLICACAO.md" -ForegroundColor Green
Write-Host ""
