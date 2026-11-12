@echo off
chcp 65001 >nul
title Lume
cd /d "%~dp0"

where claude >nul 2>nul
if errorlevel 1 (
  echo O Claude Code nao foi encontrado neste computador.
  echo Instale e faca login: https://code.claude.com/docs/en/setup
  echo Sem ele, o Lume funciona no modo sem IA.
  echo.
)

if not exist node_modules (
  echo Instalando dependencias, so na primeira vez...
  call npm install || goto erro
)

if not exist .next\BUILD_ID (
  echo Preparando o Lume, so na primeira vez...
  call npm run build || goto erro
)

echo.
echo Lume rodando em http://localhost:3000  (feche esta janela para desligar)
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
call npx next start -p 3000
goto :eof

:erro
echo.
echo Algo deu errado. Veja a mensagem acima.
pause
