@echo off
chcp 65001 >nul
title Fácil Analytics — Publicar na Internet
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\publicar.ps1"
pause
