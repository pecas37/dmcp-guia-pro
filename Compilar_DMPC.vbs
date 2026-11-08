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
        "3. Salir" & vbCrLf & vbCrLf & _
        "Elige una opcion (1-3):", _
        "Compilador DMPC", "1")

    If respuesta = "" Then Exit Do

    Select Case respuesta
        Case "1"
            comando = "powershell.exe -NoExit -Command ""$Host.UI.RawUI.BackgroundColor = 'Black'; $Host.UI.RawUI.ForegroundColor = 'Green'; Clear-Host; Set-Location '" & rutaProyecto & "'; Write-Host '=== COMPILANDO EN LOCAL ===' -ForegroundColor Cyan; npm run tauri dev; Write-Host '=== PROCESO TERMINADO ===' -ForegroundColor Cyan; exit"""
            objShell.Run comando, 1, False
            Exit Do

        Case "2"
            If MsgBox("Seguro que deseas subir los cambios a GitHub?", vbYesNo + vbQuestion, "Confirmar") = vbYes Then
                ' Se añaden comandos para configurar usuario/email y asegurar el push a la rama actual
                comando = "powershell.exe -NoExit -Command """ & _
                    "$Host.UI.RawUI.BackgroundColor = 'Black'; " & _
                    "$Host.UI.RawUI.ForegroundColor = 'Green'; " & _
                    "Clear-Host; " & _
                    "Set-Location '" & rutaProyecto & "'; " & _
                    "Write-Host '=== SUBIENDO A GITHUB ===' -ForegroundColor Cyan; " & _
                    "Write-Host 'Configurando identidad de Git...' -ForegroundColor Yellow; " & _
                    "git config user.name 'Desertor H'; " & _
                    "git config user.email 'pk2.37.hm@gmail.com'; " & _
                    "Write-Host 'Preparando archivos...' -ForegroundColor Yellow; " & _
                    "git add .; " & _
                    "git commit -m 'Actualizacion automatica DMPC'; " & _
                    "Write-Host 'Subiendo a GitHub (esto puede tardar)...' -ForegroundColor Yellow; " & _
                    "git push --set-upstream origin $(git rev-parse --abbrev-ref HEAD); " & _
                    "Write-Host '=== PROCESO TERMINADO ===' -ForegroundColor Cyan; " & _
                    "exit"""
                objShell.Run comando, 1, False
            End If
            Exit Do

        Case "3"
            Exit Do

        Case Else
            MsgBox "Opcion no valida. Por favor, elige un numero del 1 al 3.", vbExclamation, "Error"
    End Select
Loop

Set objShell = Nothing
Set fso = Nothing
