# Quick Start - Panel CRM

Guía rápida para poner en marcha el panel en 5 minutos.

## 1. Instalación (3 minutos)

```bash
# Copiar la carpeta panel a tu proyecto
cp -r BACKUP-PANEL-CRM-20251021/panel /tu/proyecto/

# Entrar a la carpeta
cd /tu/proyecto/panel

# Instalar dependencias
npm install

# Copiar archivo de ejemplo de configuración
cp .env.example .env
```

## 2. Configuración (1 minuto)

Edita el archivo `.env` y agrega tus credenciales:

```bash
PORT=3000
FACEBOOK_PIXEL_ID=TU_PIXEL_ID_AQUI
FACEBOOK_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI
```

## 3. Iniciar servidor (1 minuto)

```bash
node server.js
```

Deberías ver:

```
🚀 Servidor corriendo en http://localhost:3000
📊 Panel CRM: http://localhost:3000

📝 Configuración actual:
   - Facebook Pixel ID: TU_PIXEL_ID
   - Facebook Access Token: ✅ Configurado
```

## 4. Integrar con tu landing

Copia este código al final de tu `index.html` (antes de `</body>`):

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

    const eventId = generateEventId();

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
            console.error('Error:', error);
        }
    }

    sendTracking('pageview');

    document.addEventListener('DOMContentLoaded', () => {
        const whatsappButtons = document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]');

        whatsappButtons.forEach(button => {
            // Agregar Event ID al mensaje de WhatsApp
            const originalHref = button.href;
            button.href = originalHref + '%20Código:%20' + eventId;

            button.addEventListener('click', () => {
                sendTracking('whatsapp_click');
            });
        });
    });
</script>
```

## 5. Probar

1. Abre tu landing en el navegador
2. Haz click en el botón de WhatsApp
3. Abre el panel: http://localhost:3000
4. Deberías ver el evento registrado
5. Copia el Event ID del mensaje de WhatsApp
6. Pégalo en "Registrar mensaje recibido"
7. Click en "Marcar como mensaje"
8. Verifica en los logs que se envió a Facebook ✅

## Listo!

Tu panel CRM está funcionando. Ahora puedes:

- Ver todos los eventos capturados
- Registrar conversiones manualmente
- Ver estadísticas en tiempo real
- Revisar logs de Facebook API

---

**Documentación completa:** Ver `README-INSTALACION.md`

**Problemas comunes:**

- **No se instalan dependencias:** Verifica que tienes Node.js instalado (`node -v`)
- **Puerto 3000 ocupado:** Cambia el puerto en `.env`
- **Eventos no se capturan:** Verifica que la URL del endpoint sea correcta
- **Facebook retorna error:** Revisa que el Pixel ID y Access Token sean correctos
