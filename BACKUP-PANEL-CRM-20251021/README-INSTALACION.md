# Panel CRM - Sistema de Tracking con Facebook Conversion API

Backup creado el: 2025-10-21

## Descripción

Sistema completo de tracking de eventos para landing pages con integración a Facebook Conversion API. Permite capturar eventos de usuarios, registrar conversiones manualmente y enviarlas automáticamente a Facebook.

## Características

- Captura automática de eventos (pageview, clicks en WhatsApp)
- Captura automática de IP del usuario (mejora match rate ~50-60%)
- Captura de User Agent del navegador
- Panel CRM para gestión manual de conversiones
- Registro de mensajes recibidos (evento "Contact" a Facebook)
- Registro de compras realizadas (evento "Purchase" a Facebook)
- Logs detallados de todas las peticiones a Facebook
- Estadísticas de conversión en tiempo real
- **Exportación de eventos a Excel (formato CSV)**
- **Filtros por fecha (hoy, ayer, última semana, mes, rango personalizado)**
- **Gráficos de conversiones (visualización de clicks, mensajes y compras)**
- Zona horaria: Argentina (configurable)
- Diseño moderno con tema oscuro

---

## Requisitos

- Node.js (v14 o superior)
- NPM (viene con Node.js)
- Facebook Pixel ID
- Facebook Access Token (System User Token recomendado)

---

## Instalación

### 1. Copiar la carpeta del panel

Copia la carpeta `panel` a tu nuevo proyecto:

```bash
cp -r BACKUP-PANEL-CRM-20251021/panel /ruta/de/tu/nuevo/proyecto/
cd /ruta/de/tu/nuevo/proyecto/panel
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instalará:
- express (servidor web)
- body-parser (parseo de requests)
- cors (cross-origin requests)
- axios (peticiones HTTP a Facebook)
- dotenv (variables de entorno)
- ejs (template engine)

### 3. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `panel`:

```bash
PORT=3000
FACEBOOK_PIXEL_ID=TU_PIXEL_ID_AQUI
FACEBOOK_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI
```

**Importante:**
- Reemplaza `TU_PIXEL_ID_AQUI` con tu Facebook Pixel ID
- Reemplaza `TU_ACCESS_TOKEN_AQUI` con tu Facebook Access Token

### 4. Iniciar el servidor

```bash
node server.js
```

El panel estará disponible en: **http://localhost:3000**

---

## Integración con Landing Page

### Paso 1: Agregar el código de tracking a tu landing

Agrega este código al final de tu `index.html` (antes del cierre de `</body>`):

```html
<script>
    // Generar Event ID único
    function generateEventId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Event ID único para esta sesión
    const eventId = generateEventId();

    // Función para enviar tracking al backend
    async function sendTracking(eventType) {
        try {
            await fetch('http://localhost:3000/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: eventId,
                    event_type: eventType,
                    timestamp: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                    referrer: document.referrer || 'direct'
                })
            });
        } catch (error) {
            console.error('Error enviando tracking:', error);
        }
    }

    // Enviar pageview al cargar la página
    sendTracking('pageview');

    // Agregar tracking a botones de WhatsApp
    document.addEventListener('DOMContentLoaded', () => {
        const whatsappButtons = document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]');

        whatsappButtons.forEach(button => {
            button.addEventListener('click', () => {
                sendTracking('whatsapp_click');
            });
        });
    });
</script>
```

### Paso 2: Modificar los enlaces de WhatsApp

Agrega el Event ID a los enlaces de WhatsApp para que el usuario pueda copiarlo:

```html
<a href="https://wa.me/5491171071767?text=Hola!%20Código:%20{EVENT_ID_AQUI}"
   id="whatsappButton"
   class="cta-button">
    Contactar por WhatsApp
</a>

<script>
    // Reemplazar {EVENT_ID_AQUI} con el Event ID real
    document.addEventListener('DOMContentLoaded', () => {
        const whatsappButton = document.getElementById('whatsappButton');
        if (whatsappButton) {
            const href = whatsappButton.href.replace('{EVENT_ID_AQUI}', eventId);
            whatsappButton.href = href;
        }
    });
</script>
```

### Paso 3: Cambiar la URL del panel en producción

Si estás desplegando en producción, cambia `http://localhost:3000` por tu dominio:

```javascript
await fetch('https://tudominio.com/api/track', {
    // ...
});
```

---

## Uso del Panel

### 1. Acceder al panel

Abre tu navegador y ve a: **http://localhost:3000**

### 2. Ver eventos capturados

En el panel verás una tabla con todos los eventos de usuarios que hicieron click en WhatsApp:
- Event ID (código único)
- IP del cliente
- Fecha y hora (Argentina)
- Si hizo click en WhatsApp
- Si se registró un mensaje
- Si se registró una compra

### 3. Registrar un mensaje recibido

Cuando un usuario te escribe por WhatsApp:

1. Copia el Event ID del mensaje de WhatsApp
2. Pégalo en el campo "Registrar mensaje recibido"
3. Click en "Marcar como mensaje"
4. El sistema enviará automáticamente el evento "Contact" a Facebook

### 4. Registrar una compra

Cuando un usuario realiza una compra:

1. Copia el Event ID del cliente
2. Pégalo en el campo "Registrar compra realizada"
3. Ingresa el valor de la compra (opcional)
4. Selecciona la moneda (USD, EUR, ARS, MXN)
5. Click en "Marcar como compra"
6. El sistema enviará automáticamente el evento "Purchase" a Facebook

### 5. Ver logs de Facebook

En la sección inferior del panel verás todos los logs de las peticiones enviadas a Facebook:
- Eventos exitosos (✅)
- Eventos con error (❌)
- Detalles de cada petición
- Respuestas de Facebook

---

## Configuración Avanzada

### Cambiar zona horaria

Por defecto está configurado para Argentina. Para cambiar:

Edita `panel/views/dashboard.ejs` y busca todas las instancias de:

```javascript
timeZone: 'America/Argentina/Buenos_Aires'
```

Reemplaza con tu zona horaria (ejemplos):
- `'America/Mexico_City'` - México
- `'America/Lima'` - Perú
- `'America/Santiago'` - Chile
- `'America/Bogota'` - Colombia

### Cambiar puerto del servidor

Por defecto el panel usa el puerto 3000. Para cambiar:

Edita el archivo `.env`:

```bash
PORT=8080  # O el puerto que prefieras
```

### Agregar más monedas

Edita `panel/views/dashboard.ejs` y busca el select de monedas:

```html
<select id="purchaseCurrency" name="currency">
    <option value="USD">USD</option>
    <option value="EUR">EUR</option>
    <option value="ARS">ARS</option>
    <option value="MXN">MXN</option>
    <option value="BRL">BRL</option>  <!-- Nueva moneda -->
</select>
```

---

## Estructura de Archivos

```
panel/
├── server.js                  # Servidor principal
├── package.json              # Dependencias
├── .env                      # Variables de entorno (crear)
├── data/
│   ├── events.json          # Base de datos de eventos
│   └── facebook_logs.json   # Logs de Facebook API
├── views/
│   └── dashboard.ejs        # Vista principal del panel
└── public/
    └── style.css            # Estilos del panel
```

---

## API Endpoints

### POST /api/track
Recibe eventos desde la landing page.

**Body:**
```json
{
  "event_id": "uuid-v4",
  "event_type": "pageview|whatsapp_click",
  "timestamp": "2025-10-21T07:00:00.000Z",
  "user_agent": "Mozilla/5.0...",
  "referrer": "direct"
}
```

### GET /api/events
Obtiene todos los eventos y estadísticas.

**Response:**
```json
{
  "events": [...],
  "stats": {
    "total_clicks": 10,
    "total_messages": 5,
    "total_purchases": 2,
    "conversion_click_to_message": "50.00",
    "conversion_message_to_purchase": "40.00",
    "conversion_click_to_purchase": "20.00"
  }
}
```

### POST /api/events/:eventId/message
Marca un evento como "mensaje recibido" y envía a Facebook.

**Response:**
```json
{
  "success": true,
  "event": {...},
  "facebook_api": {
    "success": true,
    "events_received": 1
  }
}
```

### POST /api/events/:eventId/purchase
Marca un evento como "compra realizada" y envía a Facebook.

**Body:**
```json
{
  "value": 100.50,
  "currency": "USD"
}
```

### GET /api/logs
Obtiene los últimos 100 logs de Facebook API.

---

## Facebook Conversion API

### Datos enviados a Facebook

Cuando registras un mensaje o compra, el sistema envía:

```json
{
  "data": [{
    "event_name": "Contact|Purchase",
    "event_time": 1234567890,
    "event_id": "uuid-v4",
    "event_source_url": "whatsapp",
    "user_data": {
      "client_user_agent": "Mozilla/5.0...",
      "client_ip_address": "201.123.45.67"
    },
    "custom_data": {
      "value": 100.50,
      "currency": "USD"
    }
  }],
  "access_token": "..."
}
```

### Beneficios de incluir IP

- Match rate: ~30% → ~50-60%
- Geolocalización de conversiones
- Mejor atribución a anuncios
- Detección de tráfico fraudulento
- Optimización automática por ubicación

---

## Troubleshooting

### El panel no inicia

**Error:** `Cannot find module 'express'`

**Solución:** Instala las dependencias:
```bash
npm install
```

### Facebook retorna error "Invalid parameter"

**Error:** "No has añadido suficientes datos de parámetros de información de clientes"

**Solución:** Esto es una advertencia, no un error crítico. El token funciona pero Facebook pide más datos (email, teléfono). La IP ya mejora significativamente el match rate.

### Los eventos no se capturan

1. Verifica que la landing esté enviando correctamente:
   - Abre la consola del navegador (F12)
   - Busca errores de red
   - Verifica que la URL del endpoint sea correcta

2. Verifica CORS:
   - El panel ya incluye `cors()` habilitado
   - Si usas un dominio diferente, asegúrate de que esté permitido

### La hora está incorrecta

Verifica la zona horaria en `dashboard.ejs`:

```javascript
timeZone: 'America/Argentina/Buenos_Aires'
```

---

## Cómo Obtener Facebook Access Token

### Opción 1: Token de Sistema (Recomendado - No expira)

1. Ve a: https://business.facebook.com/settings/system-users
2. Click en "Agregar" → Crear nuevo usuario del sistema
3. Asigna permisos: "Administrar campañas"
4. Click en "Generar nuevo token"
5. Selecciona tu Pixel y marca estos permisos:
   - `ads_management`
   - `business_management`
6. Copia el token (empieza con `EAAN...`)

### Opción 2: Token de Usuario (Expira)

1. Ve a: https://developers.facebook.com/tools/explorer/
2. Selecciona tu app
3. Click en "Get User Access Token"
4. Marca permisos: `ads_management`, `business_management`
5. Copia el token

**Importante:** Los tokens de usuario expiran en 60 días. Los tokens de sistema NO expiran.

---

## Características de Seguridad

- Las IPs se capturan solo del lado del servidor (no JavaScript)
- Detección automática de IPs detrás de proxies/Cloudflare
- Variables sensibles en `.env` (no commitear a Git)
- CORS habilitado solo para tu dominio en producción
- Logs de todas las operaciones para auditoría

---

## Despliegue en Producción

### Recomendaciones

1. **Usar HTTPS:** Asegúrate de que tu dominio tenga certificado SSL
2. **Variables de entorno:** No expongas tu `.env` públicamente
3. **Base de datos:** Considera migrar a MongoDB/PostgreSQL para producción
4. **PM2:** Usa PM2 para mantener el proceso corriendo:

```bash
npm install -g pm2
pm2 start server.js --name "panel-crm"
pm2 save
pm2 startup
```

4. **Configurar CORS específico:**

Edita `server.js`:

```javascript
app.use(cors({
    origin: 'https://tudominio.com'
}));
```

---

## Soporte

Para problemas o preguntas:
- Revisa los logs: `panel/data/facebook_logs.json`
- Verifica la consola del servidor
- Verifica la consola del navegador (F12)

---

## Changelog

### v1.0 - 2025-10-21
- Sistema completo de tracking
- Captura automática de IP
- Panel CRM con dashboard moderno
- Integración Facebook Conversion API
- Zona horaria Argentina
- Logs detallados
- Estadísticas en tiempo real

---

**Desarrollado para:** Landing Pages con WhatsApp + Facebook Ads
**Compatibilidad:** Node.js 14+, Navegadores modernos
**Licencia:** Uso privado
