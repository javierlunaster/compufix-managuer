@echo off
REM ============================================================
REM Detiene COMPufix Manager (modo desarrollo local)
REM ============================================================
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo Deteniendo la base de datos...
docker compose down

echo.
echo ================================================================
echo  La base de datos se detuvo (los datos quedan guardados).
echo.
echo  Las ventanas del backend y del frontend NO se cierran solas a
echo  proposito - cierralas tu mismo (o presiona Ctrl+C en cada una)
echo  para no interrumpir sin avisar nada que estuvieras haciendo ahi.
echo ================================================================
echo.
pause
