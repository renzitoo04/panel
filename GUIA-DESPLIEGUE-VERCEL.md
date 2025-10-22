# Guía de Despliegue en Vercel - Landing Page

Esta guía te muestra cómo desplegar SOLO la landing page en Vercel (sin el panel).

---

## Paso 1: Preparación

Los archivos ya están listos:

- `vercel.json` → Configuración de Vercel
- `.vercelignore` → Excluye el panel y archivos innecesarios

---

## Paso 2: Desplegar con PowerShell

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
cd "C:\Users\NoxiePC\Desktop\Landing super pro( argenbet)"
vercel
```

### Durante el despliegue, Vercel te preguntará:

1. **"Set up and deploy..."** → Presiona `Y` (Yes)

2. **"Which scope do you want to deploy to?"** → Selecciona tu cuenta

3. **"Link to existing project?"** → Presiona `N` (No) si es la primera vez

4. **"What's your project's name?"** → Escribe un nombre (ej: `argenbet-landing`)

5. **"In which directory is your code located?"** → Presiona `Enter` (usa `.`)

6. **"Want to override the settings?"** → Presiona `N` (No)

Vercel desplegará SOLO la landing page (excluyendo panel, documentación, etc.)

---

## Paso 3: Ver tu landing desplegada

Cuando termine, verás algo como:

```
✅  Production: https://argenbet-landing.vercel.app
```

Copia esa URL y ábrela en tu navegador.

---

## Paso 4: Desplegar el Panel (Backend)

El panel NO se puede desplegar en Vercel junto con la landing porque:
- Necesita Node.js corriendo 24/7
- Necesita acceso a archivos JSON (base de datos)
- Vercel es para sitios estáticos, no backends

### Opciones para el Panel:

#### Opción 1: Render.com (Recomendado - GRATIS)

1. Ve a: https://render.com/
2. Click en "Sign Up" (usa GitHub)
3. Click en "New +" → "Web Service"
4. Conecta tu repositorio o sube los archivos del panel
5. Configuración:
   - **Name**: `argenbet-panel`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Click en "Advanced" → "Add Environment Variable":
   - `PORT` = `3000`
   - `FACEBOOK_PIXEL_ID` = `TU_PIXEL_ID`
   - `FACEBOOK_ACCESS_TOKEN` = `TU_TOKEN`
7. Click en "Create Web Service"

Tu panel estará en: `https://argenbet-panel.onrender.com`

#### Opción 2: Railway (GRATIS hasta $5/mes)

1. Ve a: https://railway.app/
2. Click en "Start a New Project"
3. Sube la carpeta `panel`
4. Agrega variables de entorno
5. Railway detectará Node.js automáticamente

#### Opción 3: VPS propio (DigitalOcean, Linode, etc.)

Si tienes un VPS, sube el panel y ejecuta:

```bash
npm install
npm install -g pm2
pm2 start server.js --name panel-crm
pm2 save
```

---

## Paso 5: Conectar Landing con Panel

Una vez que tengas el panel desplegado, actualiza el `index.html`:

### Si NO tienes código de tracking aún:

Agrega esto antes del `</body>` en `index.html`:

```html
<script>
    // Generar Event ID único
    function generateEventId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16));
        });
    }

    const eventId = generateEventId();

    // IMPORTANTE: Cambia esta URL por la de tu panel en producción
    const PANEL_URL = 'https://argenbet-panel.onrender.com';

    async function sendTracking(eventType) {
        try {
            await fetch(`${PANEL_URL}/api/track`, {
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
            console.error('Error:', error);
        }
    }

    // Enviar pageview
    sendTracking('pageview');

    // Agregar tracking a botones de WhatsApp
    document.addEventListener('DOMContentLoaded', () => {
        const whatsappButtons = document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]');

        whatsappButtons.forEach(button => {
            // Agregar Event ID al mensaje
            const originalHref = button.href;
            button.href = originalHref + '%20Código:%20' + eventId;

            button.addEventListener('click', () => {
                sendTracking('whatsapp_click');
            });
        });
    });
</script>
```

Luego vuelve a desplegar:

```powershell
vercel --prod
```

---

## Paso 6: Verificar que Funciona

### Test 1: Landing desplegada

1. Abre: `https://argenbet-landing.vercel.app`
2. Abre la consola del navegador (F12)
3. Busca errores
4. Haz click en el botón de WhatsApp

### Test 2: Panel recibiendo eventos

1. Abre: `https://argenbet-panel.onrender.com`
2. Deberías ver el evento que acabas de generar
3. Copia el Event ID del mensaje de WhatsApp
4. Pégalo en "Registrar mensaje"
5. Verifica que se envía a Facebook

---

## Comandos Útiles de Vercel

### Desplegar cambios:

```powershell
vercel --prod
```

### Ver lista de despliegues:

```powershell
vercel ls
```

### Ver logs:

```powershell
vercel logs
```

### Eliminar proyecto:

```powershell
vercel remove argenbet-landing
```

---

## Configuración de Dominio Propio (Opcional)

Si tienes un dominio (ej: `argenbet.com`):

1. En Vercel, ve a tu proyecto
2. Click en "Settings" → "Domains"
3. Agrega tu dominio: `argenbet.com`
4. Vercel te dará registros DNS para configurar:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```
5. Agrega esos registros en tu proveedor de dominio
6. Espera 24-48 horas (propagación DNS)

---

## Troubleshooting

### Error: "Command not found: vercel"

Instala Vercel CLI:

```powershell
npm install -g vercel
```

### Error: 404 en recursos (CSS, imágenes)

Verifica que las rutas en `index.html` sean relativas:

```html
<!-- ✅ Correcto -->
<link rel="stylesheet" href="style.css">
<img src="logo.png">

<!-- ❌ Incorrecto -->
<link rel="stylesheet" href="/style.css">
<img src="/logo.png">
```

### Error: Landing no muestra eventos en panel

1. Verifica que el panel esté corriendo
2. Abre la consola del navegador (F12) → Network
3. Busca la petición a `/api/track`
4. Verifica que la URL sea correcta

### Error: CORS

Si ves error de CORS en la consola, actualiza `panel/server.js`:

```javascript
app.use(cors({
    origin: ['https://argenbet-landing.vercel.app', 'http://localhost:4001']
}));
```

---

## Resumen

1. ✅ **Landing en Vercel**: Solo archivos estáticos (HTML, CSS, JS, imágenes)
2. ✅ **Panel en Render/Railway**: Backend de Node.js corriendo 24/7
3. ✅ **Landing se conecta al panel**: vía `fetch()` a la URL del panel

**Arquitectura:**

```
Usuario
  ↓
Landing (Vercel)
  ↓ (API calls)
Panel CRM (Render)
  ↓ (API calls)
Facebook
```

---

¡Listo para desplegar! 🚀

**Siguiente paso:** Ejecuta `vercel` en PowerShell dentro de la carpeta del proyecto.
