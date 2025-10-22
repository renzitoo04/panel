# 🔄 Reiniciar Servidor del Panel

## ✅ Token Actualizado

El nuevo Access Token ha sido guardado en `panel/.env`:

```bash
FACEBOOK_ACCESS_TOKEN=EAAN3I4m121MBPgQtawshrrQW8fFZCzDFrZASIZB8aZBMK5MyZCFusZAKZAHA6kqwMMcZBdZAvHYCYjvojCC9JOQe7fuKvEdIOSm2CiUAtWmtVZCWXknlxO3Cr6yJ0HFmEDehZCyMIIlmOC72tEUkG384p5jOEGmkK7GSsAIk7ZAI7IVNBZCrUZAX2ncMOZAxCW3ZBMA7XQZDZD
```

---

## 🚀 Cómo Reiniciar el Servidor

### Opción 1: Si el servidor está corriendo en una terminal

1. Ve a la terminal donde está corriendo el servidor del panel
2. Presiona **Ctrl + C** para detenerlo
3. Ejecuta de nuevo:
   ```bash
   cd "/mnt/c/Users/NoxiePC/Desktop/Landing super pro( argenbet)/panel"
   node server.js
   ```

---

### Opción 2: Si no sabes dónde está corriendo

Puedes matar todos los procesos de Node.js y reiniciar:

**En Linux/WSL:**
```bash
# Detener todos los servidores Node.js
killall node

# Reiniciar el panel
cd "/mnt/c/Users/NoxiePC/Desktop/Landing super pro( argenbet)/panel"
node server.js
```

**En Windows (PowerShell):**
```powershell
# Detener todos los procesos de Node.js
taskkill /IM node.exe /F

# Reiniciar el panel
cd "C:\Users\NoxiePC\Desktop\Landing super pro( argenbet)\panel"
node server.js
```

---

## ✅ Verificación

Cuando el servidor se reinicie, deberías ver:

```bash
🚀 Servidor corriendo en http://localhost:3000
📊 Panel CRM: http://localhost:3000

📝 Configuración actual:
   - Facebook Pixel ID: 1126842699347074
   - Facebook Access Token: ✅ Configurado

💡 Recuerda configurar las variables de entorno en el archivo .env
```

---

## 🧪 Probar que el Token Funciona

Después de reiniciar, haz una prueba rápida:

1. Abre http://localhost:4001 (landing)
2. Haz click en el botón de WhatsApp
3. Copia el Event ID de la consola
4. Abre http://localhost:3000 (panel)
5. Marca el evento como "Mensaje"
6. Ve a Facebook Test Events: https://business.facebook.com/events_manager2/list/pixel/1126842699347074/test_events
7. Deberías ver el evento `Contact` aparecer

**Si aparece el evento en Test Events → El token funciona correctamente ✅**

---

## ❌ Si Ves Errores

### Error: "Invalid OAuth access token"

```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

**Posibles causas:**
1. El token ya expiró
2. El token no tiene permisos correctos
3. El token fue generado para otro Pixel

**Solución:** Genera un token nuevo (preferiblemente de System User) siguiendo la guía `COMO-OBTENER-TOKEN-PERMANENTE.md`

---

### Error: "Insufficient permission"

```json
{
  "error": {
    "message": "Insufficient permission",
    "type": "FacebookApiException"
  }
}
```

**Causa:** El token no tiene permisos para enviar eventos.

**Solución:**
1. Verifica que tu cuenta tenga permisos de Admin en el Pixel
2. Genera un token nuevo con permisos `ads_management` y `business_management`

---

**Fecha:** 2025-10-21
