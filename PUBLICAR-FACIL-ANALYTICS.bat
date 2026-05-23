@echo off

chcp 65001 >nul

title Facil Analytics - Publicar na Internet

cd /d "%~dp0"



echo.

echo  Abrindo checklist e iniciando assistente de publicacao...

echo.



if exist "CHECKLIST-PUBLICACAO.md" (

    start "" "CHECKLIST-PUBLICACAO.md"

)



powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\publicar.ps1"

set ERR=%ERRORLEVEL%



if not "%ERR%"=="0" (

    echo.

    echo  Assistente encerrado com codigo %ERR%.

    echo  Leia a mensagem acima. Se faltou a URL do Neon, rode este .bat de novo.

    echo  Ou siga CHECKLIST-PUBLICACAO.md manualmente.

    echo.

)



echo.

pause


