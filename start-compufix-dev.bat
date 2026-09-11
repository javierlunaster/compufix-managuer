@echo off
REM ============================================================
REM Lanzador de COMPufix Manager - modo desarrollo local
REM Doble clic para levantar todo: base de datos + backend + frontend
REM ============================================================
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo === COMPufix Manager - modo desarrollo ===
echo.

echo Verificando que Docker Desktop este corriendo...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo Docker Desktop no parece estar corriendo.
    echo Abrelo desde el menu de inicio, espera a que la ballena de la
    echo barra de tareas deje de moverse, y vuelve a hacer doble clic aqui.
    echo.
    pause
    exit /b 1
)

echo Iniciando la base de datos Postgres...
docker compose up -d

REM docker compose up -d vuelve al instante, no espera a que Postgres
REM termine de inicializar - sobre todo la primera vez, cuando crea su
REM carpeta de datos desde cero. Sin esta pausa, prisma migrate deploy
REM podria intentar conectarse antes de que Postgres este listo.
timeout /t 5 /nobreak >nul

REM --- Backend: configuracion y dependencias --------------------------
if not exist "%PROJECT_DIR%backend\.env" (
    echo.
    echo No existe backend\.env - copiando desde .env.example...
    echo Si ya tenias un .env con datos reales, esto NO lo sobrescribe,
    echo solo se copia cuando el archivo no existe todavia.
    copy "%PROJECT_DIR%backend\.env.example" "%PROJECT_DIR%backend\.env" >nul
)

if not exist "%PROJECT_DIR%backend\node_modules" (
    echo.
    echo Primera vez, o carpeta node_modules borrada - instalando
    echo dependencias del backend, puede tardar unos minutos...
    pushd "%PROJECT_DIR%backend"

    REM npm reciente bloquea por defecto los scripts de instalacion de
    REM bcrypt y prisma -compilar y generar el cliente- hasta aprobarlos
    REM explicitamente, sin esto el backend compila pero se cae al
    REM arrancar reclamando que faltan esos dos.
    call npm approve-scripts --all
    call npm install
    popd
)

REM Aplica migraciones pendientes en CADA arranque, no solo la primera
REM vez - es rapido y no hace nada si ya estan todas aplicadas, pero
REM asi nunca hace falta acordarse de correrlo a mano tras actualizar
REM el codigo con una migracion nueva.
echo Verificando que la base de datos este al dia...
pushd "%PROJECT_DIR%backend"
call npx prisma migrate deploy
popd

REM --- Frontend: dependencias ------------------------------------------
if not exist "%PROJECT_DIR%frontend\node_modules" (
    echo.
    echo Primera vez, o carpeta node_modules borrada - instalando
    echo dependencias del frontend, puede tardar unos minutos...
    pushd "%PROJECT_DIR%frontend"
    call npm install
    popd
)

echo.
echo Abriendo el backend en una ventana nueva...
start "COMPufix - Backend" cmd /k "cd /d "%PROJECT_DIR%backend" && npm run start:dev"

echo Abriendo el frontend en una ventana nueva...
start "COMPufix - Frontend" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo.
echo Esperando a que el sistema termine de arrancar, unos segundos...
timeout /t 12 /nobreak >nul

echo Abriendo el navegador...
start http://localhost:5173

echo.
echo ================================================================
echo  Listo. El backend y el frontend quedaron corriendo cada uno en
echo  su propia ventana - no las cierres mientras trabajas.
echo.
echo  Esta ventana se puede cerrar sin problema.
echo ================================================================
echo.
pause
