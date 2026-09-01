# Inicia COMPufix Manager. Pensado para ejecutarse desde el acceso directo
# que crea el instalador — no necesita que la persona sepa nada de Docker
# ni de la terminal; solo hace doble clic.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== COMPufix Manager ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Verificar que Docker Desktop esté instalado y corriendo ---------
$dockerOk = $false
try {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch {
    $dockerOk = $false
}

if (-not $dockerOk) {
    Write-Host "Docker Desktop no está corriendo (o no está instalado)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Si ya lo instalaste: ábrelo desde el menú de inicio, espera a que la" -ForegroundColor Yellow
    Write-Host "ballena en la barra de tareas deje de moverse, y vuelve a intentar." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Si no lo has instalado: descárgalo de" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para cerrar"
    exit 1
}

# --- 2. Generar secretos la primera vez ----------------------------------
if (-not (Test-Path ".env")) {
    Write-Host "Primera vez que se inicia — generando configuración propia..."
    & powershell -ExecutionPolicy Bypass -File "generate-env.ps1"
}

# --- 3. Levantar los contenedores (construye la primera vez, reutiliza
#        las imágenes ya construidas las siguientes) ---------------------
Write-Host "Iniciando COMPufix Manager…"
Write-Host "(la primera vez puede tardar varios minutos mientras se prepara todo)" -ForegroundColor DarkGray
docker compose -f docker-compose.installer.yml --env-file .env up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Algo falló al iniciar los contenedores. Revisa el mensaje de arriba." -ForegroundColor Red
    Read-Host "Presiona Enter para cerrar"
    exit 1
}

# --- 4. Esperar a que el backend responda --------------------------------
Write-Host "Esperando a que el sistema esté listo…"
$maxAttempts = 90
$attempt = 0
$ready = $false
while ($attempt -lt $maxAttempts -and -not $ready) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) { $ready = $true }
    } catch {
        # Todavía no responde — normal mientras se termina de construir o
        # de aplicar las migraciones de base de datos.
    }
    $attempt++
}

if (-not $ready) {
    Write-Host ""
    Write-Host "El sistema está tardando más de lo normal en responder." -ForegroundColor Yellow
    Write-Host "Puedes seguir esperando e intentar abrir http://localhost:8080 manualmente," -ForegroundColor Yellow
    Write-Host "o revisar el estado con: docker compose -f docker-compose.installer.yml logs" -ForegroundColor Yellow
    Read-Host "Presiona Enter para cerrar"
    exit 1
}

# --- 5. Cargar catálogos iniciales, solo la primera vez ------------------
$seedMarker = ".seeded"
if (-not (Test-Path $seedMarker)) {
    Write-Host "Cargando catálogos iniciales (marcas, tipos de equipo, roles, usuario administrador)…"
    docker compose -f docker-compose.installer.yml exec -T backend npm run seed
    if ($LASTEXITCODE -eq 0) {
        New-Item -Path $seedMarker -ItemType File | Out-Null
        Write-Host ""
        Write-Host "Usuario inicial creado — usuario: admin / contraseña: CambiarEstaClave123!" -ForegroundColor Green
        Write-Host "Cámbiala apenas inicies sesión (menú del usuario → cambiar contraseña)." -ForegroundColor Green
    } else {
        Write-Host "No se pudieron cargar los catálogos iniciales — puedes reintentarlo luego" -ForegroundColor Yellow
        Write-Host "ejecutando: docker compose -f docker-compose.installer.yml exec backend npm run seed" -ForegroundColor Yellow
    }
}

# --- 6. Abrir en el navegador ---------------------------------------------
Write-Host ""
Write-Host "¡Listo! Abriendo COMPufix Manager…" -ForegroundColor Cyan
Start-Process "http://localhost:8080"

Write-Host ""
Write-Host "Puedes cerrar esta ventana — la aplicación sigue corriendo en segundo plano."
Write-Host "Para detenerla más tarde, usa el acceso directo 'Detener COMPufix Manager'."
Start-Sleep -Seconds 3
