; ============================================================================
; COMPufix Manager — Instalador de Windows (Inno Setup)
; ============================================================================
; Este archivo es el CÓDIGO FUENTE del instalador, no el instalador en sí.
; Para convertirlo en un .exe distribuible:
;
;   1. Descarga e instala Inno Setup (gratuito): https://jrsoftware.org/isdl.php
;   2. Abre este archivo (setup.iss) con el "Inno Setup Compiler"
;   3. Clic en Build → Compile (o presiona Ctrl+F9)
;   4. El instalador queda en installer\Output\COMPufix-Manager-Setup.exe
;
; Requisito para compilar: este archivo debe estar en la carpeta
; "installer\" dentro del proyecto completo (con "backend\" y "frontend\"
; como carpetas hermanas un nivel arriba) — así es como se entrega el zip.
; ============================================================================

#define MyAppName "COMPufix Manager"
#define MyAppVersion "1.0"
#define MyAppPublisher "COMPufix"
#define MyAppExeName "start-compufix.ps1"

[Setup]
AppId={{A8F3E4B2-6C1D-4E9A-9B7F-2D5C8A1E3F60}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
; Se instala en Archivos de Programa — requiere permisos de administrador,
; normal para software que corre servicios en segundo plano.
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
; No se pide compresión LZMA2 al máximo: el instalador solo empaqueta
; código fuente (backend/frontend), no binarios pesados — Docker descarga
; y construye todo lo demás en el primer arranque.
Compression=lzma2
SolidCompression=yes
OutputDir=Output
OutputBaseFilename=COMPufix-Manager-Setup
; Sin ícono propio todavía — se puede agregar un .ico aquí más adelante:
; SetupIconFile=compufix.ico
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el Escritorio"; GroupDescription: "Accesos directos adicionales:"

[Files]
; Código fuente del backend y frontend — Docker los construye en el
; primer arranque, así que aquí solo va el código, nunca node_modules
; ni carpetas de build (quedarían obsoletas y solo pesarían de más).
Source: "..\backend\*"; DestDir: "{app}\backend"; Flags: recursesubdirs createallsubdirs; Excludes: "node_modules,dist,.env,uploads,coverage"
Source: "..\frontend\*"; DestDir: "{app}\frontend"; Flags: recursesubdirs createallsubdirs; Excludes: "node_modules,dist,.env"

; Scripts y configuración de la instalación de escritorio.
Source: "docker-compose.installer.yml"; DestDir: "{app}"; Flags: ignoreversion
Source: "generate-env.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "start-compufix.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "stop-compufix.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Iniciar {#MyAppName}"; Filename: "powershell.exe"; \
    Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\start-compufix.ps1"""; \
    WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 13
Name: "{group}\Detener {#MyAppName}"; Filename: "powershell.exe"; \
    Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop-compufix.ps1"""; \
    WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 27
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Iniciar {#MyAppName}"; Filename: "powershell.exe"; \
    Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\start-compufix.ps1"""; \
    WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 13; \
    Tasks: desktopicon

[Code]
{ Verifica que Docker Desktop esté instalado antes de continuar — sin él,
  la aplicación no tiene forma de correr. Se revisa la ruta de instalación
  típica; si no aparece, se avisa con un enlace de descarga en vez de
  dejar que la instalación "funcione" y luego falle en silencio al primer
  arranque. }
function DockerDesktopInstalled(): Boolean;
begin
  Result := FileExists(ExpandConstant('{pf}\Docker\Docker\Docker Desktop.exe')) or
            FileExists(ExpandConstant('{autopf}\Docker\Docker\Docker Desktop.exe'));
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if not DockerDesktopInstalled() then
  begin
    if MsgBox('No se detectó Docker Desktop instalado en este computador.' + #13#10 + #13#10 +
       'COMPufix Manager necesita Docker Desktop para funcionar (es lo que corre ' +
       'la base de datos y el sistema, sin instalar nada más por separado).' + #13#10 + #13#10 +
       'Descárgalo gratis desde: https://www.docker.com/products/docker-desktop' + #13#10 + #13#10 +
       '¿Continuar de todas formas con la instalación? (podrás instalar Docker ' +
       'Desktop después y usar los accesos directos normalmente)',
       mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
    end;
  end;
end;

[Run]
Filename: "powershell.exe"; \
    Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\start-compufix.ps1"""; \
    WorkingDir: "{app}"; \
    Description: "Iniciar {#MyAppName} ahora"; \
    Flags: postinstall nowait skipifsilent

[UninstallRun]
; Antes de borrar los archivos, apaga los contenedores ordenadamente.
; NO se borran los volúmenes de datos aquí (ver [Code] más abajo) — la
; base de datos y las fotos subidas sobreviven a una desinstalación, por
; si la persona la vuelve a instalar después.
Filename: "powershell.exe"; \
    Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop-compufix.ps1"""; \
    WorkingDir: "{app}"; Flags: runhidden waituntilterminated

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
