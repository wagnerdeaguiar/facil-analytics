@echo off
chcp 65001 >nul
title Fácil Analytics — Publicar na Internet
cd /d "%~dp0"

echo.
echo  Abrindo checklist e iniciando assistente de publicacao...
echo.

if exist "CHECKLIST-PUBLICACAO.md" (
    start "" "CHECKLIST-PUBLICACAO.md"
)

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\publicar.ps1"
set EXITCODE=%ERRORLEVEL%

if %EXITCODE% neq 0 (
    echo.
    echo  ERRO: o assistente falhou (codigo %EXITCODE%).
    echo  Abra CHECKLIST-PUBLICACAO.md e siga manualmente.
    echo.
)

pause
