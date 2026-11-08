' ==========================================
' Lanzador de Compilación DMPC (Estilo Cyberpunk)
' ==========================================
Option Explicit

Dim objShell, fso, rutaProyecto, respuesta, comando

Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtiene la carpeta donde está este script
rutaProyecto = fso.GetParentFolderName(WScript.ScriptFullName)

Do
    respuesta = InputBox( _
        "=== DMPC GUIA PRO ===" & vbCrLf & vbCrLf & _
        "1. Compilar en Local (npm run tauri dev)" & vbCrLf & _
        "2. Subir a GitHub y compilar APK" & vbCrLf & _
        "3. Compilar Instalador PC (.exe)" & vbCrLf & _
        "4. Salir" & vbCrLf & vbCrLf & _
        "Elige una opcion (1-4):", _
        "Compilador DMPC", "1")

    If respuesta = "" Then Exit Do

    Select Case respuesta
        Case "1"
            comando = "powershell.exe -NoExit -Command ""$Host.UI.RawUI.BackgroundColor = 'Black'; $Host.UI.RawUI.ForegroundColor = 'Green'; Clear-Host; Set-Location '" & rutaProyecto & "'; Write-Host '=== COMPILANDO EN LOCAL ===' -ForegroundColor Cyan; npm run tauri dev; Write-Host '=== PROCESO TERMINADO ===' -ForegroundColor Cyan; exit"""
            objShell.Run comando, 1, False
            Exit Do

        Case "2"
            If MsgBox("Seguro que deseas subir los cambios a GitHub?", vbYesNo + vbQuestion, "Confirmar") = vbYes Then
                comando = "powershell.exe -NoExit -Command """ & _
                    "$Host.UI.RawUI.BackgroundColor = 'Black'; " & _
                    "$Host.UI.RawUI.ForegroundColor = 'Green'; " & _
                    "Clear-Host; " & _
                    "Set-Location '" & rutaProyecto & "'; " & _
                    "Write-Host '=== SUBIENDO A GITHUB ===' -ForegroundColor Cyan; " & _
                    "git config user.name 'Desertor H'; " & _
                    "git config user.email 'pk2.37.hm@gmail.com'; " & _
                    "Write-Host 'Sincronizando con GitHub...' -ForegroundColor Yellow; " & _
                    "git pull --rebase --autostash origin main; " & _
                    "if ($LASTEXITCODE -ne 0) { Write-Host '!!! ERROR: Conflicto o fallo en el pull. Resuelvelo manualmente. !!!' -ForegroundColor Red; Read-Host 'Presiona Enter para cerrar'; exit }; " & _
                    "Write-Host 'Preparando archivos...' -ForegroundColor Yellow; " & _
                    "git add .; " & _
                    "git commit -m 'Actualizacion automatica DMPC'; " & _
                    "Write-Host 'Subiendo a GitHub...' -ForegroundColor Yellow; " & _
                    "git push --set-upstream origin main; " & _
                    "Write-Host '=== PROCESO TERMINADO ===' -ForegroundColor Cyan; " & _
                    "Read-Host 'Presiona Enter para cerrar'; " & _
                    "exit"""
                objShell.Run comando, 1, False
            End If
            Exit Do

        Case "3"
            ' Compilar el instalador para PC
            comando = "powershell.exe -NoExit -Command """ & _
                "$Host.UI.RawUI.BackgroundColor = 'Black'; " & _
                "$Host.UI.RawUI.ForegroundColor = 'Green'; " & _
                "Clear-Host; " & _
                "Set-Location '" & rutaProyecto & "'; " & _
                "Write-Host '=== COMPILANDO INSTALADOR PARA PC ===' -ForegroundColor Cyan; " & _
                "Write-Host 'Esto puede tardar varios minutos...' -ForegroundColor Yellow; " & _
                "npm run tauri build; " & _
                "if ($LASTEXITCODE -eq 0) { " & _
                "  Write-Host '=== COMPILACION EXITOSA ===' -ForegroundColor Green; " & _
                "  Write-Host 'El instalador se ha guardado en: src-tauri/target/release/bundle/' -ForegroundColor Cyan; " & _
                "} else { " & _
                "  Write-Host '!!! ERROR EN LA COMPILACION !!!' -ForegroundColor Red; " & _
                "}; " & _
                "Write-Host '=== PROCESO TERMINADO ===' -ForegroundColor Cyan; " & _
                "Read-Host 'Presiona Enter para cerrar'; " & _
                "exit"""
            objShell.Run comando, 1, False
            Exit Do
            
        Case "4"
            Exit Do
            
        Case Else
            MsgBox "Opcion no valida. Por favor, elige un numero del 1 al 4.", vbExclamation, "Error"
    End Select
Loop

Set objShell = Nothing
Set fso = Nothing