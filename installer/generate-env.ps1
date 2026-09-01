# Genera un archivo .env con secretos aleatorios la primera vez que se
# instala COMPufix Manager. Si ya existe uno, no lo toca — así reinstalar
# o actualizar la aplicación no le cambia la contraseña de la base de
# datos ni invalida las sesiones activas de todos los usuarios.

$ErrorActionPreference = "Stop"
$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "Ya existe un archivo .env — se conserva el actual."
    exit 0
}

function New-RandomSecret {
    param([int]$Bytes = 32)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buffer = New-Object byte[] $Bytes
    $rng.GetBytes($buffer)
    # Base64 URL-safe (sin '/', '+' ni '=') para que el valor sea seguro de
    # usar tal cual dentro de un archivo .env sin necesitar comillas.
    return [Convert]::ToBase64String($buffer) -replace '\+', '-' -replace '/', '_' -replace '=', ''
}

$dbPassword = New-RandomSecret -Bytes 24
$jwtSecret = New-RandomSecret -Bytes 48
$encryptionKey = New-RandomSecret -Bytes 32

$content = @"
DB_PASSWORD=$dbPassword
JWT_SECRET=$jwtSecret
ENCRYPTION_KEY=$encryptionKey
"@

Set-Content -Path $envPath -Value $content -Encoding UTF8
Write-Host "Archivo .env generado con secretos propios en: $envPath"
