@echo off
title DMPC PRO - Iniciando...
color 0B
echo ========================================
echo   DMPC PRO - Guia Evolutiva
echo ========================================
echo.
echo Iniciando la aplicacion...
echo.
powershell -NoExit -Command "cd '%~dp0'; npm run tauri dev"