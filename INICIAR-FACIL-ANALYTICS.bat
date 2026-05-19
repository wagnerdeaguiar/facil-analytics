@echo off
chcp 65001 >nul
title Fácil Analytics
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\iniciar.ps1"
pause
