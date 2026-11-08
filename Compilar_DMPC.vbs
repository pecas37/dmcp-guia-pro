' ==========================================
' Lanzador de Compilación DMPC (Estilo Cyberpunk)
' ==========================================
Option Explicit

Dim objShell, fso, rutaProyecto, respuesta, comando

Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

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
            ' Abre PowerShell con fondo oscuro y letras verdes, ejecuta el comando y cierra al terminar
            comando = "powershell.exe -NoExit -Command ""$Host.UI.RawUI.BackgroundColor = 'Black'; $Host.UI.RawUI.ForegroundColor = 'Green'; Clear-Host; Set-Location '" & rutaProyecto & "'; Write-Host '=== COMPILANDO EN LOCAL ===' -ForegroundColor Cyan; npm run tauri dev; Write-Host '=== PROCESO TERMINADO ===' -ForegroundColor Cyan; exit"""
            objShell.Run comando, 1, False
            Exit Do
            
        Case "2"
            If MsgBox("¿Seguro que deseas subir los cambios a GitHub?", vbYesNo + vbQuestion, "Confirmar") = vbYes Then
                comando = "powershell.exe -NoExit -Command ""$Host.UI.RawUI.BackgroundColor = 'Black'; $Host.UI.RawUI.ForegroundColor = 'Green'; Clear-Host; Set-Location '" & rutaProyecto & "'; Write-Host '=== SUBIENDO A GITHUB ===' -ForegroundColor Cyan; git add .; git commit -m 'Actualizacion automatica DMPC'; git push; Write-Host '=== PROCESO TERMINADO ===' -ForegroundColor Cyan; exit"""
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