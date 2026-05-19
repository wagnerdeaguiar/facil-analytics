# Inicia tudo automaticamente — Fácil Analytics
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

Write-Host ""
Write-Host "=== Fácil Analytics — Iniciando ===" -ForegroundColor Cyan
Write-Host ""

# Banco de dados
Write-Host "[1/3] Subindo banco de dados (Docker)..." -ForegroundColor Yellow
docker compose up -d 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Docker pode não estar instalado ou ligado." -ForegroundColor Red
    Write-Host "Instale Docker Desktop e tente de novo." -ForegroundColor Red
} else {
    Start-Sleep -Seconds 4
    Write-Host "      Banco OK na porta 5433" -ForegroundColor Green
}

# Prisma
Write-Host "[2/3] Preparando banco de dados do app..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss 2>&1 | Out-Null
Write-Host "      Pronto" -ForegroundColor Green

# Abrir navegador
$url = "http://localhost:3010/comecar"
Write-Host "[3/3] Abrindo o app no navegador..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  >>> $url <<<" -ForegroundColor Green
Write-Host ""
Write-Host "Se o navegador nao abrir, copie o endereco acima." -ForegroundColor Gray
Write-Host "Para parar o app: Ctrl+C nesta janela." -ForegroundColor Gray
Write-Host ""

Start-Sleep -Seconds 2
Start-Process $url

npm run dev
