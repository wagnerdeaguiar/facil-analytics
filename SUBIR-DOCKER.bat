@echo off
chcp 65001 >nul
title Fácil Analytics — Subir banco Docker
cd /d "%~dp0"
echo.
echo === Subindo PostgreSQL (Docker) ===
echo.
docker compose up -d
if errorlevel 1 (
    echo.
    echo ERRO: Abra o Docker Desktop e espere ficar verde, depois rode este arquivo de novo.
    pause
    exit /b 1
)
timeout /t 6 /nobreak >nul
echo.
echo Banco em 127.0.0.1:5433 — OK
echo Agora execute INICIAR-FACIL-ANALYTICS.bat
echo.
pause
