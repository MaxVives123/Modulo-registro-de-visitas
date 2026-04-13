@echo off
echo ============================================
echo   Sistema de Registro de Visitas
echo   Iniciando servicios...
echo ============================================
echo.

REM Verificar Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no esta instalado o no esta en el PATH.
    echo Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Levantar servicios
echo [1/3] Construyendo e iniciando contenedores...
docker-compose up -d --build db app

echo.
echo [2/3] Esperando a que la base de datos este lista...
timeout /t 10 /nobreak >nul

echo.
echo [3/3] Cargando datos de demostracion...
docker-compose run --rm seed

echo.
echo ============================================
echo   Sistema listo!
echo.
echo   URL: http://localhost:3000
echo.
echo   Credenciales:
echo     Admin:     admin / admin123
echo     Recepcion: recepcion / recepcion123
echo.
echo   Para detener: docker-compose down
echo ============================================
echo.
pause
