# Guía de pruebas para eventos de Facebook

Este documento explica cómo probar los eventos de Facebook utilizando los scripts incluidos en este proyecto.

## Requisitos previos

- Node.js instalado
- Paquetes instalados (`npm install`)
- Variables de entorno configuradas en el archivo `.env`

## Variables de entorno

El archivo `.env` ya ha sido configurado con los siguientes valores:

```
PIXEL_ID=712318277831073
FB_TOKEN=EAAJhxuxLfyQBO92jv0aWb8JWe9N7C3QNfgbwvL6MnCIpyPFbIVmIwOZBNmW711Iuc27MTtNdMDxnliW7ogYIiNcai8W3W4p3OOauJdZC4SxKCWkWX0F69iXBl9HYx1r8S2lSn9ujvLUwUNU6NDczUG3Nv8uYVc1cg4VOUZCfy0og8tjAeaJL6dKZATEGYgDf2AZDZD
TEST_EVENT_CODE=TEST1332
```

## Pruebas disponibles

### 1. Probar el evento "TestEvent" con el script original

Este comando ejecuta el script que envía un evento de prueba genérico a Facebook:

```powershell
npm run test-direct
```

Internamente, este comando ejecuta `node ./scripts/test-facebook-api.js`, que:
- Lee las configuraciones desde el archivo `.env`
- Crea un evento de prueba llamado "TestEvent"
- Envía el evento a la API de Conversiones de Facebook
- Muestra la respuesta y detalles del evento enviado

### 2. Probar específicamente el evento "Lead" con el nuevo script

Este comando ejecuta el script que envía un evento de Lead a Facebook:

```powershell
npm run test-lead
```

Internamente, este comando ejecuta `node ./scripts/test-facebook-lead.js`, que:
- Lee las configuraciones desde el archivo `.env`
- Crea un evento específicamente de tipo "Lead"
- Envía el evento a la API de Conversiones de Facebook
- Muestra la respuesta y detalles del evento enviado

### 3. Pruebas adicionales desde el API local

Si tienes el servidor local en ejecución (usando `npm start`), puedes probar los endpoints API directamente:

```powershell
# Probar el endpoint de Facebook Event
npm run test:fb

# Probar el endpoint de Meta Conversion API
npm run test:meta

# Probar conversión con datos personalizados
npm run test-conversion
```

## Solución de problemas

Si encuentras errores durante las pruebas:

1. Verifica que el token de acceso no haya expirado
2. Confirma que el ID del Pixel sea correcto
3. Asegúrate de que el código de evento de prueba (TEST_EVENT_CODE) esté configurado correctamente en tu cuenta de Meta
4. Revisa los permisos de tu cuenta de Facebook para la API de Conversiones

## Visualización de eventos en Facebook

Los eventos enviados en modo de prueba (con test_event_code) se pueden ver en:
1. Facebook Business Manager > Eventos > Administrador de eventos > Prueba de eventos
2. Facebook Ads Manager > Herramientas > Eventos > Test Events

Recuerda que estos eventos no afectan tus estadísticas reales, ya que están marcados como eventos de prueba.
