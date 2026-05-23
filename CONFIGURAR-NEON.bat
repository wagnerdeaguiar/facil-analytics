@echo off

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\configurar-neon.ps1"

pause


