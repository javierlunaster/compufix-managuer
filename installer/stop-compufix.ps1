# Detiene COMPufix Manager. Los datos (base de datos, fotos subidas) se
# conservan intactos — solo se apagan los contenedores, no se borran los
# volúmenes. La próxima vez que se inicie, todo sigue donde quedó.

Set-Location $PSScriptRoot

Write-Host "Deteniendo COMPufix Manager…" -ForegroundColor Cyan
docker compose -f docker-compose.installer.yml down

Write-Host "COMPufix Manager detenido. Los datos quedaron guardados." -ForegroundColor Green
Start-Sleep -Seconds 2
