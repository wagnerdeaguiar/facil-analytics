@echo off
cd /d "%~dp0"
if exist "CHECKLIST-PUBLICACAO.md" (
    start "" "CHECKLIST-PUBLICACAO.md"
) else (
    echo Arquivo CHECKLIST-PUBLICACAO.md nao encontrado.
    pause
)
