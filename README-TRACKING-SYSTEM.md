# 📊 Sistema de Tracking con Facebook Pixel y Conversion API

Sistema completo de seguimiento de conversiones que integra Facebook Pixel en una landing page y envía eventos de conversión a la Facebook Conversion API con deduplicación mediante `event_id`.

## 🎯 Características

- ✅ Landing page con botón de WhatsApp
- ✅ Generación automática de `event_id` único (UUID)
- ✅ Integración con Facebook Pixel
- ✅ Envío del `event_id` en el mensaje de WhatsApp
- ✅ Panel CRM para gestionar conversiones
- ✅ Integración con Facebook Conversion API
- ✅ Deduplicación automática de eventos
- ✅ Estadísticas y métricas en tiempo real
- ✅ Sistema de colores por estado de conversión

## 📁 Estructura del Proyecto

```
/
├── landing/                 # Landing page (frontend)
│   ├── index.html          # Página principal
│   ├── style.css           # Estilos de la landing
│   └── script.js           # Lógica de tracking y WhatsApp
│
├── panel/                   # Panel CRM (backend)
│   ├── server.js           # Servidor Express
│   ├── package.json        # Dependencias
│   ├── views/
│   │   └── dashboard.ejs   # Vista del panel
│   ├── public/
│   │   └── style.css       # Estilos del panel
│   └── data/
│       └── events.json     # Base de datos (JSON)
│
├── .env.example            # Ejemplo de variables de entorno
└── README-TRACKING-SYSTEM.md  # Este archivo
```

## 🚀 Instalación

### 1. Instalar dependencias del backend

```bash
cd panel
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto (copia desde `.env.example`):

```bash
cp .env.example .env
```

Edita el archivo `.env` y configura:

```env
PORT=3000
FACEBOOK_PIXEL_ID=tu_pixel_id_aqui
FACEBOOK_ACCESS_TOKEN=tu_access_token_aqui
```

### 3. Configurar número de WhatsApp

Edita el archivo `landing/script.js` y configura tu número de WhatsApp:

```javascript
const CONFIG = {
    whatsappNumber: '5491123456789',  // CAMBIAR por tu número
    backendUrl: 'http://localhost:3000',
    // ...
};
```

**Formato del número:**
- Incluye código de país (sin el símbolo +)
- Sin espacios ni guiones
- Ejemplos:
  - Argentina: `5491123456789`
  - México: `521234567890`
  - España: `34612345678`

### 4. Configurar Facebook Pixel ID

Edita el archivo `landing/index.html` y reemplaza `YOUR_PIXEL_ID`:

```html
<!-- Línea 12 y 18 -->
fbq('init', 'TU_PIXEL_ID_REAL');
```

## 📋 Obtener credenciales de Facebook

### Facebook Pixel ID

1. Ve a [Facebook Business Manager](https://business.facebook.com)
2. Navega a **Events Manager**
3. Selecciona tu Pixel
4. El ID aparece en la parte superior (número de 15-16 dígitos)

### Facebook Access Token

1. Ve a [Facebook Business Manager](https://business.facebook.com)
2. Navega a **Configuración del sistema** > **Tokens de acceso**
3. Genera un nuevo token con los permisos:
   - `ads_management`
   - `business_management`
4. Copia el token (comienza con `EAA...`)

⚠️ **IMPORTANTE**: El token es secreto, nunca lo compartas ni lo subas a repositorios públicos.

## 🎬 Uso

### Iniciar el backend/panel

```bash
cd panel
npm start
```

El servidor estará corriendo en: `http://localhost:3000`

### Abrir la landing page

Simplemente abre el archivo `landing/index.html` en tu navegador, o súbelo a un servidor web.

## 🔄 Flujo de trabajo

### 1. Usuario visita la landing

- Se genera un `event_id` único automáticamente
- Se registra en el backend
- Se envía el evento "PageView" a Facebook Pixel

### 2. Usuario hace clic en el botón de WhatsApp

- Se envía el evento "ClickWhatsApp" a Facebook Pixel con el `event_id`
- Se registra el clic en el backend
- Se redirige a WhatsApp con el mensaje que incluye el `event_id`

Ejemplo de mensaje:
```
¡Hola! Vi la promoción. Código de seguimiento: 038d3f7c-bb9c-41fc-9a30-c08ce7c84e9f
```

### 3. Cliente te escribe por WhatsApp

Cuando recibas un mensaje, copia el código de seguimiento (event_id) y:

1. Ve al panel CRM: `http://localhost:3000`
2. En "Registrar mensaje recibido", pega el código
3. Haz clic en "Marcar como mensaje"

Esto:
- Actualiza el estado del evento en el sistema
- Envía el evento `Contact` a Facebook Conversion API
- Facebook deduplica automáticamente usando el `event_id`

### 4. Cliente realiza una compra

1. Ve al panel CRM
2. En "Registrar compra realizada", pega el código del cliente
3. (Opcional) Ingresa el valor de la compra
4. Haz clic en "Marcar como compra"

Esto:
- Actualiza el estado a "Compra"
- Envía el evento `Purchase` a Facebook Conversion API
- Facebook optimiza las campañas basándose en conversiones reales

## 📊 Panel CRM

El panel muestra:

### Estadísticas principales
- 👆 Clicks totales
- 💬 Mensajes recibidos
- 🛒 Compras realizadas
- 📈 Tasa de conversión total

### Métricas de conversión
- Click → Mensaje (%)
- Mensaje → Compra (%)

### Tabla de eventos
Muestra todos los eventos con código de colores:
- 🩶 Gris: Solo vista (pageview)
- 🔵 Azul: Click en WhatsApp
- 🟡 Amarillo: Mensaje recibido
- 🟢 Verde: Compra realizada

## 🎨 Personalización

### Landing Page

Edita `landing/index.html` y `landing/style.css` para:
- Cambiar textos
- Modificar colores
- Ajustar diseño

### Mensaje de WhatsApp

Edita `landing/script.js`:

```javascript
defaultMessage: 'Tu mensaje personalizado: '
```

### Colores del panel

Edita `panel/public/style.css` para cambiar la paleta de colores.

## 🔒 Seguridad

- ✅ El `event_id` no es visible para el usuario (solo en el código)
- ✅ El Access Token se guarda en `.env` (no subir a Git)
- ✅ El panel debería protegerse con autenticación en producción

## 🌐 Deployment (Producción)

### Opción 1: Hosting tradicional (landing)

Sube los archivos de `landing/` a cualquier hosting web (Netlify, Vercel, etc.)

Actualiza `landing/script.js` con la URL de tu backend:

```javascript
backendUrl: 'https://tu-backend.com'
```

### Opción 2: VPS/Cloud (backend)

1. Sube el directorio `panel/` a tu servidor
2. Instala dependencias: `npm install`
3. Configura variables de entorno
4. Usa PM2 para mantenerlo corriendo:

```bash
npm install -g pm2
pm2 start server.js --name facebook-tracking
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

### El evento no se registra en el backend

- Verifica que el servidor esté corriendo
- Abre la consola del navegador (F12) y busca errores
- Verifica que la URL en `landing/script.js` sea correcta

### Facebook no recibe los eventos

- Verifica que el Pixel ID sea correcto
- Verifica que el Access Token tenga los permisos correctos
- Verifica en Facebook Events Manager si los eventos llegan

### El botón de WhatsApp no funciona

- Verifica que el número esté en el formato correcto
- Abre la consola del navegador y busca errores

## 📈 Próximos pasos (opcional)

- [ ] Agregar autenticación al panel
- [ ] Migrar de JSON a SQLite o MongoDB
- [ ] Agregar más eventos personalizados
- [ ] Crear API para integrar con otros sistemas
- [ ] Agregar webhooks para automatizar el registro de eventos

## 📞 Soporte

Si tienes problemas:

1. Revisa la consola del navegador (F12)
2. Revisa los logs del servidor
3. Verifica que todas las configuraciones estén correctas

## 📄 Licencia

Este proyecto es de código abierto y puede ser usado libremente.

---

**Creado con ❤️ para optimizar tus campañas de Facebook**
