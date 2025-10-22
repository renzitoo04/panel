# 🔑 Cómo Funciona el Facebook Access Token

## ✅ ESTADO ACTUAL: Token Ya Configurado

**Tu sistema YA TIENE el Access Token configurado y funcionando.**

**Archivo:** `panel/.env` (línea 3)
```bash
FACEBOOK_ACCESS_TOKEN=EAAR7uPgFvj8BO2WoA8r9ZCZCtL70WDOs7OaLNQAuxNFCSewnN52LbA43EGBhF0vkAUSHy0A0WGZAgIB8gD6ZAZCEQjAJmZBBZA17DK5tadY0Wf8GnhZAS2maQZAC35qgvyzTBtsbZBFUYFen8Wfphy6gsOQMG7jDOMvV9x25oZBlVi1YyJmnp7YAfamrndzvktgPgZDZD
```

**Pixel ID configurado:**
```bash
FACEBOOK_PIXEL_ID=1126842699347074
```

---

## 🎯 Qué es el Access Token

El **Access Token** (Token de Acceso) es una clave secreta que:

1. **Autoriza** a tu servidor a enviar eventos a Facebook
2. **Identifica** tu cuenta de Facebook Business
3. **Permite** usar la Conversion API sin necesidad de login manual

Es como una **contraseña especial** que le das a tu servidor para que pueda comunicarse con Facebook en tu nombre.

---

## 📋 Cómo Está Configurado Actualmente

### 1️⃣ Archivo `.env`
**Ubicación:** `panel/.env`

```bash
PORT=3000
FACEBOOK_PIXEL_ID=1126842699347074
FACEBOOK_ACCESS_TOKEN=EAAR7uPgFvj8BO2WoA8r9ZCZCtL70WDOs7OaLNQAuxNFCSewnN52LbA43EGBhF0vkAUSHy0A0WGZAgIB8gD6ZAZCEQjAJmZBBZA17DK5tadY0Wf8GnhZAS2maQZAC35qgvyzTBtsbZBFUYFen8Wfphy6gsOQMG7jDOMvV9x25oZBlVi1YyJmnp7YAfamrndzvktgPgZDZD
```

### 2️⃣ Cómo lo Usa el Servidor
**Archivo:** `panel/server.js` (líneas 15-16)

```javascript
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || 'YOUR_PIXEL_ID';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';
```

El servidor lee las variables de entorno del archivo `.env` usando `dotenv`.

### 3️⃣ Dónde se Envía a Facebook
**Archivo:** `panel/server.js` (líneas 104-117)

```javascript
const payload = {
    data: [{
        event_name: eventName, // 'Contact' o 'Purchase'
        event_time: currentTime,
        event_id: eventId,
        event_source_url: eventData.source_url || 'https://tudominio.com',
        user_data: {
            client_user_agent: eventData.user_agent || 'unknown'
        },
        custom_data: eventData.custom_data || {}
    }],
    access_token: FACEBOOK_ACCESS_TOKEN // ← ACÁ SE USA EL TOKEN
};
```

---

## 🔍 Cómo Verificar Que Funciona

### Método 1: Revisar Logs del Panel

1. Abre: http://localhost:3000
2. Ve a la sección **"📊 Logs de Facebook API"**
3. Busca logs con `status: "success"`

**Ejemplo de log exitoso:**
```json
{
  "timestamp": "2025-10-21T12:34:56.789Z",
  "event_id": "6e16ff4b-d444-4228-aae1-9d348c734f4d",
  "event_name": "Contact",
  "pixel_id": "1126842699347074",
  "status": "success",
  "response": {
    "events_received": 1,
    "messages": []
  }
}
```

**Si ves `status: "error"`**, revisa el campo `error` para más detalles.

---

### Método 2: Test Events Tool de Facebook

1. Ve a: https://business.facebook.com/events_manager2
2. Selecciona tu Pixel: **1126842699347074**
3. Click en **"Test Events"** (Eventos de Prueba)
4. Selecciona **"From Server"** (Desde el Servidor)
5. Marca un evento como "Mensaje" en el panel
6. **Deberías ver el evento aparecer en tiempo real** en Test Events

**Captura de ejemplo:**
```
Event Name: Contact
Event ID: 6e16ff4b-d444-4228-aae1-9d348c734f4d
Event Time: [timestamp]
User Data: { client_user_agent: "..." }
```

---

### Método 3: Revisar Consola del Servidor

Cuando el panel envía eventos a Facebook, verás logs en la terminal:

**Éxito:**
```bash
✅ Evento Contact enviado a Facebook Conversion API: {
  events_received: 1,
  messages: []
}
```

**Error:**
```bash
❌ Error enviando evento a Facebook: {
  error: {
    message: "Invalid OAuth access token",
    type: "OAuthException",
    code: 190
  }
}
```

---

## 🔄 Cómo Obtener un Token Nuevo (Si Este Expira)

Los Access Tokens de Facebook **pueden expirar**. Si ves errores como:
- `"Invalid OAuth access token"`
- `"Session has expired"`
- `"Error validating access token"`

Sigue estos pasos para obtener uno nuevo:

---

### Paso 1: Accede a Facebook Events Manager

1. Ve a: https://business.facebook.com/events_manager2
2. Inicia sesión con tu cuenta de Facebook
3. Selecciona tu Pixel: **1126842699347074**

---

### Paso 2: Ve a Configuración de Conversions API

1. En el menú lateral, busca **"Settings"** (Configuración)
2. Click en **"Conversions API"**

**O directo:**
https://business.facebook.com/events_manager2/list/pixel/1126842699347074/settings

---

### Paso 3: Generar Access Token

1. Busca la sección **"Set up Conversions API"**
2. Click en **"Generate Access Token"** o **"Manually Set Up Conversions API"**
3. Facebook te mostrará un token largo como:
   ```
   EAAR7uPgFvj8BO2WoA8r9ZCZCtL70WDOs7OaLNQAuxNFCSewnN52LbA43EGBhF0vkAUSHy0A0WGZAgIB8gD6ZAZCEQjAJmZBBZA17DK5tadY0Wf8GnhZAS2maQZAC35qgvyzTBtsbZBFUYFen8Wfphy6gsOQMG7jDOMvV9x25oZBlVi1YyJmnp7YAfamrndzvktgPgZDZD
   ```

4. **COPIA EL TOKEN COMPLETO**

---

### Paso 4: Actualizar el .env

1. Abre `panel/.env`
2. Reemplaza el valor de `FACEBOOK_ACCESS_TOKEN`:

```bash
FACEBOOK_ACCESS_TOKEN=EL_NUEVO_TOKEN_QUE_COPIASTE
```

3. **Guarda el archivo**

---

### Paso 5: Reiniciar el Servidor

**Terminal del panel:**
```bash
# Detener el servidor (Ctrl+C)
# Reiniciar:
cd panel
node server.js
```

**Deberías ver:**
```bash
🚀 Servidor corriendo en http://localhost:3000
📊 Panel CRM: http://localhost:3000

📝 Configuración actual:
   - Facebook Pixel ID: 1126842699347074
   - Facebook Access Token: ✅ Configurado

💡 Recuerda configurar las variables de entorno en el archivo .env
```

---

## 🔐 Qué Permisos Necesita el Token

El Access Token debe tener estos permisos:

1. **`ads_management`** - Para enviar eventos de conversión
2. **`business_management`** - Para gestionar el Pixel

**Facebook asigna estos permisos automáticamente** cuando generas un Access Token desde Events Manager → Conversions API.

---

## ❓ Preguntas Frecuentes

### ¿El token expira?

**Sí**, los Access Tokens de Facebook pueden expirar dependiendo del tipo:

- **Short-lived tokens**: Expiran en 1-2 horas
- **Long-lived tokens**: Expiran en 60 días
- **System User tokens**: No expiran (recomendado para servidores)

**Para obtener un token permanente:**
1. Crea un **System User** en Facebook Business Manager
2. Asigna el permiso para gestionar el Pixel
3. Genera un Access Token desde el System User

---

### ¿Cómo sé si mi token expiró?

Verás errores en los logs del panel:

```json
{
  "status": "error",
  "error": {
    "message": "Error validating access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

**Solución:** Genera un token nuevo siguiendo los pasos anteriores.

---

### ¿Es seguro tener el token en el .env?

**Sí**, siempre que:
1. ✅ El archivo `.env` NO esté en Git (ya está en `.gitignore`)
2. ✅ No compartas el `.env` públicamente
3. ✅ Solo esté en el servidor

**NUNCA pongas el Access Token en:**
- ❌ El código de la landing (`index.html`)
- ❌ El frontend (JavaScript visible al usuario)
- ❌ Repositorios públicos de GitHub

**El Access Token debe estar SOLO en el backend** (`panel/.env`).

---

### ¿Puedo usar el mismo token en múltiples proyectos?

**Sí**, siempre que:
- Todos los proyectos usen el mismo Pixel ID
- El token tenga los permisos necesarios
- Todos los proyectos sean de la misma cuenta de Facebook Business

---

### ¿Qué pasa si alguien roba mi token?

Si alguien obtiene tu Access Token, podría:
- Enviar eventos falsos a tu Pixel
- Ver datos de tu cuenta de Facebook Ads

**Solución:**
1. Ve a Facebook Business Manager
2. Revoca el token comprometido
3. Genera un token nuevo
4. Actualiza el `.env` con el nuevo token

---

## 🔗 Enlaces Útiles de Facebook

1. **Events Manager:**
   https://business.facebook.com/events_manager2

2. **Configuración de Conversions API:**
   https://business.facebook.com/events_manager2/list/pixel/1126842699347074/settings

3. **Documentación oficial de Access Tokens:**
   https://developers.facebook.com/docs/marketing-api/conversions-api/get-started#access-token

4. **Test Events Tool:**
   https://business.facebook.com/events_manager2/list/pixel/1126842699347074/test_events

5. **System Users (tokens permanentes):**
   https://business.facebook.com/settings/system-users

---

## ✅ Resumen

| Aspecto | Estado | Ubicación |
|---------|--------|-----------|
| Access Token | ✅ Configurado | `panel/.env` línea 3 |
| Pixel ID | ✅ Configurado | `panel/.env` línea 2 |
| Cómo se usa | ✅ En Conversion API | `panel/server.js` línea 116 |
| Permisos | ✅ Automáticos | Asignados por Facebook |
| Expiración | ⚠️ Puede expirar | Verificar en Test Events |

**Tu sistema está configurado correctamente.**

**Para verificar que funciona:**
1. Abre http://localhost:3000
2. Marca un evento como "Mensaje"
3. Ve a **Test Events** en Facebook
4. Deberías ver el evento `Contact` aparecer en tiempo real

---

**Fecha:** 2025-10-21
**Versión:** 1.0
