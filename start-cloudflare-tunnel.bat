@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   Cloudflare Tunnel (acceso desde Internet)
echo ============================================
echo.
echo Requisitos:
echo   1. Docker corriendo con la app en el puerto 3000
echo      (docker compose up -d)
echo   2. cloudflared instalado
echo      winget install Cloudflare.cloudflared
echo.
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encuentra cloudflared en el PATH.
    echo Instala con: winget install Cloudflare.cloudflared
    echo Luego cierra y abre esta ventana de nuevo.
    pause
    exit /b 1
)

echo Iniciando túnel hacia http://127.0.0.1:3000 ...
echo.
echo Cuando aparezca la URL https://....trycloudflare.com
echo cópiala y:
echo   - Pásala al cliente para abrir el sistema
echo   - Opcional: pon esa misma URL en APP_URL en tu archivo .env
echo     y reinicia el contenedor visitas_app para que los QR apunten bien.
echo.
echo Pulsa Ctrl+C para detener el túnel.
echo ============================================
echo.

cloudflared tunnel --url http://127.0.0.1:3000

pause
