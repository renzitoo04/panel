@echo off
echo ========================================================
echo Utilidad de pruebas de eventos de Facebook Conversiones API
echo ========================================================
echo.
echo Opciones disponibles:
echo 1. Iniciar servidor local
echo 2. Probar evento TestEvent usando script-direct
echo 3. Probar evento Lead usando script-lead
echo 4. Ejecutar todas las pruebas
echo 5. Salir
echo.

:menu
set /p opcion=Seleccione una opcion (1-5): 

if "%opcion%"=="1" goto iniciar_servidor
if "%opcion%"=="2" goto probar_test
if "%opcion%"=="3" goto probar_lead
if "%opcion%"=="4" goto probar_todo
if "%opcion%"=="5" goto salir

echo Opcion invalida. Intente de nuevo.
goto menu

:iniciar_servidor
echo.
echo Iniciando servidor local...
echo Presione Ctrl+C para detener el servidor cuando termine las pruebas.
echo.
start cmd /k "npm start"
echo Servidor iniciado en una nueva ventana.
echo.
pause
goto menu

:probar_test
echo.
echo Probando evento TestEvent...
call npm run test-direct
echo.
pause
goto menu

:probar_lead
echo.
echo Probando evento Lead...
call npm run test-lead
echo.
pause
goto menu

:probar_todo
echo.
echo Ejecutando todas las pruebas...

echo.
echo 1. Probando evento TestEvent...
call npm run test-direct

echo.
echo 2. Probando evento Lead...
call npm run test-lead

echo.
echo 3. Probando API mediante curl (asegurate de que el servidor este en ejecucion)
echo Si el servidor no esta en ejecucion, estas pruebas fallaran.
timeout /t 3
call npm run test:fb
call npm run test:meta
call npm run test-conversion

echo.
echo Todas las pruebas completadas.
pause
goto menu

:salir
echo.
echo Saliendo del programa...
exit
