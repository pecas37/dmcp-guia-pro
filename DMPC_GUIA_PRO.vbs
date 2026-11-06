Set objShell = CreateObject("WScript.Shell")

' Obtener la ruta de la carpeta donde está este script
Dim rutaProyecto
rutaProyecto = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Construir el comando de PowerShell con el diseño personalizado
Dim comando
comando = "powershell.exe -NoExit -Command ""& {" & _
          "$Host.UI.RawUI.WindowTitle = 'DMPC PRO - Iniciando...'; " & _
          "$Host.UI.RawUI.BackgroundColor = 'Black'; " & _
          "$Host.UI.RawUI.ForegroundColor = 'Cyan'; " & _
          "Clear-Host; " & _
          "Write-Host '========================================' -ForegroundColor Cyan; " & _
          "Write-Host '      DMPC PRO - GUIA EVOLUTIVA' -ForegroundColor White; " & _
          "Write-Host '========================================' -ForegroundColor Cyan; " & _
          "Write-Host ''; " & _
          "Write-Host 'Iniciando entorno de desarrollo...' -ForegroundColor Yellow; " & _
          "Write-Host 'Espera mientras se compila el nucleo de Rust.' -ForegroundColor Gray; " & _
          "Write-Host ''; " & _
          "Set-Location -Path '" & rutaProyecto & "'; " & _
          "npm run tauri dev" & _
          "}"""

' Ejecutar PowerShell (0 = ocultar la ventana de VBS, False = no esperar a que termine)
objShell.Run comando, 1, False