# Inicia tudo automaticamente — Fácil Analytics
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

function Test-DockerRodando {
    docker info 2>&1 | Out-Null
    return $LASTEXITCODE -eq 0
}

function Start-DockerDesktop {
    $paths = @(
        "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            Write-Host "      Abrindo Docker Desktop..." -ForegroundColor Gray
            Start-Process $p
            return $true
        }
    }
    return $false
}

function Wait-Docker([int]$segundosMax = 90) {
    $t0 = Get-Date
    while (((Get-Date) - $t0).TotalSeconds -lt $segundosMax) {
        if (Test-DockerRodando) { return $true }
        Start-Sleep -Seconds 3
        Write-Host "      Aguardando Docker..." -ForegroundColor Gray
    }
    return $false
}

function Test-BancoPronto {
    npx prisma db push --accept-data-loss 2>&1 | Out-Null
    return $LASTEXITCODE -eq 0
}

Write-Host ""
Write-Host "=== Fácil Analytics — Iniciando ===" -ForegroundColor Cyan
Write-Host ""

# --- Docker + Postgres ---
Write-Host "[1/3] Banco de dados (Docker)..." -ForegroundColor Yellow
$dockerOk = $false

if (-not (Test-DockerRodando)) {
    Start-DockerDesktop | Out-Null
    Wait-Docker 90 | Out-Null
}

if (Test-DockerRodando) {
    docker compose up -d 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Start-Sleep -Seconds 6
        if (Test-BancoPronto) {
            $dockerOk = $true
            Write-Host "      Banco OK em 127.0.0.1:5433" -ForegroundColor Green
        }
    }
}

if (-not $dockerOk) {
    Write-Host ""
    Write-Host "  ERRO: Banco de dados indisponivel." -ForegroundColor Red
    Write-Host ""
    Write-Host "  O Docker Desktop precisa estar RODANDO (icone baleia verde)." -ForegroundColor Yellow
    Write-Host "  1) Abra 'Docker Desktop' no menu Iniciar do Windows" -ForegroundColor White
    Write-Host "  2) Espere 1-2 min ate 'Docker is running'" -ForegroundColor White
    Write-Host "  3) Execute INICIAR-FACIL-ANALYTICS.bat novamente" -ForegroundColor White
    Write-Host ""
    Write-Host "  Sem banco o login NAO funciona." -ForegroundColor Gray
    Write-Host ""
    Read-Host "Pressione ENTER para fechar"
    exit 1
}

# --- Prisma ---
Write-Host "[2/3] Schema do app..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss 2>&1 | Out-Null
Write-Host "      Pronto" -ForegroundColor Green

# --- App ---
$url = "http://localhost:3010/comecar"
Write-Host "[3/3] Abrindo $url ..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Use SEMPRE a porta 3010 (nao 3000)." -ForegroundColor Gray
Write-Host "  Para parar: Ctrl+C nesta janela." -ForegroundColor Gray
Write-Host ""

Start-Sleep -Seconds 2
Start-Process $url

npm run dev
