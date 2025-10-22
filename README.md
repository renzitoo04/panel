# Golden Landing Page

## Configuración de Facebook Pixel y Conversiones API

El proyecto utiliza **Facebook Pixel** (ID: `1126842699347074`) y la **API de Conversiones de Facebook** para un seguimiento más preciso de eventos.

### Sistema de Tracking Dual

La landing implementa tracking dual para máxima precisión:
- **Facebook Pixel** (lado del cliente): Tracking inmediato via JavaScript
- **Conversions API** (lado del servidor): Tracking redundante que evita bloqueadores de anuncios

Ambos métodos envían el evento estándar **"Contact"** con el mismo `event_id` para deduplicación automática.

### Variables de entorno importantes:

- `PIXEL_ID`: 1126842699347074 (unificado en todos los archivos)
- `FB_TOKEN`: Token de acceso para la API de Conversiones
- `TEST_EVENT_CODE`: TEST1332 (código para eventos de prueba)

## Test de la API de Conversiones de Meta

Se han añadido varias opciones para probar la API de Conversiones de Meta:

### Opción 1: Scripts directos para eventos específicos

Estas son las formas más sencillas y recomendadas:

```bash
# Probar un evento genérico "TestEvent"
npm run test-direct

# Probar específicamente un evento "Lead"
npm run test-lead
```

Estos scripts utilizan las variables de entorno directamente de tu archivo `.env` y muestran los resultados detallados en la consola.

### Opción 2: Servidor de desarrollo con endpoints de prueba

#### Paso 1: Iniciar el servidor de desarrollo

```bash
npm start
```

#### Paso 2: En otra terminal, ejecutar alguno de estos comandos:

```bash
# Prueba básica con email de ejemplo
npm run test:meta

# Prueba completa con event_name, email y custom_data
npm run test-conversion
```

#### Endpoint disponible: `/api/test-conversion-api`

También puedes probar directamente usando curl:

```bash
curl -X POST http://localhost:3000/api/test-conversion-api \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "TestEvent", 
    "email": "cliente@ejemplo.com", 
    "custom_data": {"value": 49.99, "currency": "USD"}
  }'
```

### Verificación de resultados:

La respuesta incluirá:
- Detalles del evento enviado (ID, nombre, timestamp)
- Respuesta directa de la API de Meta
- Email de prueba usado (y su versión hasheada)
- Cualquier error que ocurra durante el proceso

Este endpoint usa las variables de tu archivo `.env` pero permite que las sobrescribas en la petición.

## Desarrollo

```
npm install
npm start
```

## Despliegue

Este proyecto está configurado para ser desplegado en Vercel.

```
vercel --prod
```

## Solución de problemas

Si encuentras errores al ejecutar los tests:

1. **Error de conexión al localhost:3000**: Asegúrate de que el servidor está en ejecución con `npm start`
2. **Error en la API de Meta**: Verifica tu token de acceso y el código de evento de prueba
3. **Token de acceso expirado**: Regenera tu token en el Meta Business Manager

### Nota adicional:

El proyecto incluye un SUPER B0N0 en tu primer depósito y RET1R0S sin límites para usuarios VIP.
