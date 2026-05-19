# Publicação guiada — Fácil Analytics (Vercel + Neon)
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

function Pause-Step($msg) {
    Write-Host ""
    Write-Host $msg -ForegroundColor Yellow
    Read-Host "Pressione ENTER quando terminar este passo"
}

function Open-Link($url) {
    Start-Process $url
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FÁCIL ANALYTICS — PUBLICAR NA WEB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- GitHub ---
Write-Host "[1/7] GitHub..." -ForegroundColor Yellow
$remote = git remote get-url origin 2>$null
if ($remote -notmatch "wagnerdeaguiar/facil-analytics") {
    git remote set-url origin "https://github.com/wagnerdeaguiar/facil-analytics.git"
}
$status = git status --porcelain
if ($status) {
    git add -A
    git commit -m "Atualização antes do deploy" 2>$null
}
git push -u origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "      Código no GitHub OK" -ForegroundColor Green
} else {
    Write-Host "      AVISO: push falhou (credencial?). Continue mesmo assim se o código já estiver no GitHub." -ForegroundColor Red
}

# --- Neon ---
Write-Host ""
Write-Host "[2/7] Banco de dados (Neon)..." -ForegroundColor Yellow
Write-Host "      Abrindo Neon.tech — crie um projeto PostgreSQL GRÁTIS." -ForegroundColor Gray
Write-Host "      Copie a Connection string (postgresql://...)" -ForegroundColor Gray
Open-Link "https://console.neon.tech/app/projects"
Pause-Step "Cole a connection string do Neon abaixo:"

$dbUrl = Read-Host "DATABASE_URL (Neon)"
if (-not $dbUrl -or $dbUrl -notmatch "^postgresql") {
    Write-Host "URL inválida. Tente de novo mais tarde." -ForegroundColor Red
    exit 1
}
if ($dbUrl -notmatch "sslmode") {
    $dbUrl = if ($dbUrl -match "\?") { "$dbUrl&sslmode=require" } else { "$dbUrl?sslmode=require" }
}

Write-Host "      Criando tabelas no banco..." -ForegroundColor Gray
$env:DATABASE_URL = $dbUrl
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no Prisma. Verifique a URL do Neon." -ForegroundColor Red
    exit 1
}
npm run db:seed-perfis 2>&1 | Out-Null
Write-Host "      Banco preparado" -ForegroundColor Green

$xlsx = @(
    "$env:USERPROFILE\Downloads\Lotofácil.xlsx",
    "$env:USERPROFILE\Downloads\Lotofacil.xlsx",
    "$raiz\Lotofácil.xlsx",
    "$raiz\data\Lotofácil.xlsx"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($xlsx) {
    Write-Host "      Importando planilha: $xlsx (pode demorar)..." -ForegroundColor Gray
    npx tsx prisma/import-xlsx.ts "`"$xlsx`"" 2>&1
    Write-Host "      Histórico importado" -ForegroundColor Green
} else {
    Write-Host "      Planilha xlsx não encontrada — importe depois em Configurações no site." -ForegroundColor Yellow
}

# --- .env.vercel ---
Write-Host ""
Write-Host "[3/7] Arquivo de configuração..." -ForegroundColor Yellow
$envFile = Join-Path $raiz ".env.vercel"
$template = Join-Path $raiz ".env.vercel.template"
if (-not (Test-Path $envFile)) {
    Copy-Item $template $envFile
}

$content = Get-Content $envFile -Raw
if ($content -notmatch "NEXTAUTH_SECRET=.+") {
    $secret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
    $content = $content -replace "NEXTAUTH_SECRET=.*", "NEXTAUTH_SECRET=$secret"
}
$content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=$dbUrl"
Set-Content -Path $envFile -Value $content -Encoding UTF8

Write-Host ""
Write-Host "[4/7] Google OAuth (login no site)..." -ForegroundColor Yellow
Write-Host @"
      1) Abra: https://console.cloud.google.com/apis/credentials
      2) Criar credenciais → ID do cliente OAuth → Aplicativo da Web
      3) Origem JavaScript: https://facil-analytics.vercel.app (ajuste depois se a URL for outra)
      4) Redirect URI: https://facil-analytics.vercel.app/api/auth/callback/google
      5) Copie Client ID e Client Secret para o arquivo:
         $envFile
"@ -ForegroundColor Gray
Open-Link "https://console.cloud.google.com/apis/credentials"
Pause-Step "Edite .env.vercel com GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET, depois ENTER"

# Atualizar NEXTAUTH_URL se usuário informar
Write-Host "Qual será a URL do site? (Enter = https://facil-analytics.vercel.app)" -ForegroundColor Gray
$urlSite = Read-Host "NEXTAUTH_URL"
if (-not $urlSite) { $urlSite = "https://facil-analytics.vercel.app" }
$urlSite = $urlSite.TrimEnd("/")
(Get-Content $envFile) -replace "NEXTAUTH_URL=.*", "NEXTAUTH_URL=$urlSite" | Set-Content $envFile

# --- Vercel import ---
Write-Host ""
Write-Host "[5/7] Vercel (hospedagem)..." -ForegroundColor Yellow
Write-Host "      Abrindo importação do projeto no Vercel..." -ForegroundColor Gray
Open-Link "https://vercel.com/new/import?s=https://github.com/wagnerdeaguiar/facil-analytics"
Write-Host ""
Write-Host "      No Vercel:" -ForegroundColor Cyan
Write-Host "      - Login com GitHub" -ForegroundColor White
Write-Host "      - Importar facil-analytics → Deploy" -ForegroundColor White
Write-Host "      - Settings → Environment Variables → cole TUDO do arquivo:" -ForegroundColor White
Write-Host "        $envFile" -ForegroundColor Green
Write-Host ""
notepad $envFile
Pause-Step "Depois de colar as variáveis no Vercel e fazer Deploy, pressione ENTER"

# --- Vercel CLI (opcional) ---
Write-Host ""
Write-Host "[6/7] Vercel CLI (opcional — redeploy rápido)..." -ForegroundColor Yellow
$useCli = Read-Host "Quer instalar e usar Vercel CLI agora? (s/N)"
if ($useCli -match "^[sS]") {
    npm install -g vercel 2>&1 | Out-Null
    Write-Host "      Faça login no navegador quando abrir..." -ForegroundColor Gray
    vercel login
    vercel link --yes 2>$null
    vercel env pull .env.vercel.local 2>$null
    vercel --prod
}

# --- Fim ---
Write-Host ""
Write-Host "[7/7] Concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "  Site (ajuste se usou outro nome no Vercel):" -ForegroundColor Cyan
Write-Host "  $urlSite" -ForegroundColor Green
Write-Host ""
Write-Host "  Entre com Google (não use /comecar em produção)." -ForegroundColor Gray
Write-Host "  Admin: wagdeaguiar@gmail.com (ADMIN_EMAIL no .env.vercel)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Arquivo de variáveis: $envFile" -ForegroundColor Gray
Write-Host ""
