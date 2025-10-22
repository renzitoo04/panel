# ✅ Cómo Verificar Que el Access Token Funciona

## 🎯 Prueba Rápida (5 minutos)

### Paso 1: Asegúrate de que los servidores estén corriendo

**Terminal 1 - Panel:**
```bash
cd "/mnt/c/Users/NoxiePC/Desktop/Landing super pro( argenbet)/panel"
node server.js
```

**Deberías ver:**
```
🚀 Servidor corriendo en http://localhost:3000
📊 Panel CRM: http://localhost:3000

📝 Configuración actual:
   - Facebook Pixel ID: 1126842699347074
   - Facebook Access Token: ✅ Configurado
```

---

**Terminal 2 - Landing:**
```bash
cd "/mnt/c/Users/NoxiePC/Desktop/Landing super pro( argenbet)"
node server-landing.js
```

**Deberías ver:**
```
🚀 Landing page corriendo en http://localhost:4001
📝 SIN auto-reload - No recargará automáticamente
```

---

### Paso 2: Limpiar base de datos (para prueba limpia)

```bash
cd "/mnt/c/Users/NoxiePC/Desktop/Landing super pro( argenbet)/panel/data"
echo "[]" > events.json
echo "[]" > facebook_logs.json
```

---

### Paso 3: Abrir Test Events de Facebook

1. Abre en tu navegador: https://business.facebook.com/events_manager2/list/pixel/1126842699347074/test_events

2. Click en **"Test Events"** (arriba a la derecha)

3. Selecciona **"From Server"** (eventos desde servidor)

**DEJA ESTA PESTAÑA ABIERTA** - Aquí verás los eventos en tiempo real.

---

### Paso 4: Generar un evento de prueba

#### 4.1 - Visita la landing

1. Abre http://localhost:4001
2. Abre la consola (F12)
3. Deberías ver:
   ```
   🆔 Event ID: 6e16ff4b-d444-4228-aae1-9d348c734f4d
   ✅ pageview registrado - Response: 200
   ✅ FB: PageView
   ```

4. Click en el botón de WhatsApp
5. Deberías ver:
   ```
   🖱️ Click detectado
   ✅ whatsapp_click registrado - Response: 200
   ✅ FB: ClickWhatsApp
   ```

6. **Copia el Event ID** de la consola (ejemplo: `6e16ff4b-d444-4228-aae1-9d348c734f4d`)

---

#### 4.2 - Abre el panel

1. Abre http://localhost:3000
2. Deberías ver **1 evento** en la tabla con:
   - Event ID: `6e16ff4b-d444-4228-aae1-9d348c734f4d`
   - Tipo: pageview
   - Click WhatsApp: ✅ Sí

---

#### 4.3 - Marca como "Mensaje"

1. En el panel, busca el evento que acabas de crear
2. En la columna **"Mensaje"**, pega el Event ID en el input
3. Click en **"Marcar Mensaje"**

**Lo que debería pasar:**

**En el panel:**
- El evento cambia a color **amarillo** (tiene mensaje)
- Aparece la fecha/hora del mensaje

**En la consola del servidor (Terminal 1):**
```bash
✅ Evento Contact enviado a Facebook Conversion API: {
  events_received: 1,
  messages: []
}
```

**En Test Events de Facebook:**
- ✅ Deberías ver aparecer un evento **"Contact"** en tiempo real
- Con el mismo **Event ID**: `6e16ff4b-d444-4228-aae1-9d348c734f4d`

---

#### 4.4 - Marca como "Compra"

1. En el panel, en la columna **"Compra"**:
   - Event ID: `6e16ff4b-d444-4228-aae1-9d348c734f4d`
   - Valor: `100`
   - Click en **"Marcar Compra"**

**Lo que debería pasar:**

**En el panel:**
- El evento cambia a color **verde** (tiene compra)
- Muestra el valor de la compra ($100)

**En la consola del servidor (Terminal 1):**
```bash
✅ Evento Purchase enviado a Facebook Conversion API: {
  events_received: 1,
  messages: []
}
```

**En Test Events de Facebook:**
- ✅ Deberías ver aparecer un evento **"Purchase"** en tiempo real
- Con el mismo **Event ID**: `6e16ff4b-d444-4228-aae1-9d348c734f4d`
- Con **custom_data**: `{ value: 100, currency: "USD" }`

---

## ✅ Si Todo Funciona Correctamente

**Deberías ver en Test Events de Facebook:**

```
┌────────────────────────────────────────────────────────────┐
│ Test Events - From Server                                  │
├────────────────────────────────────────────────────────────┤
│ Event: Purchase                                            │
│ Event ID: 6e16ff4b-d444-4228-aae1-9d348c734f4d            │
│ Time: [hace unos segundos]                                 │
│ Custom Data: { value: 100, currency: "USD" }              │
├────────────────────────────────────────────────────────────┤
│ Event: Contact                                             │
│ Event ID: 6e16ff4b-d444-4228-aae1-9d348c734f4d            │
│ Time: [hace unos segundos]                                 │
├────────────────────────────────────────────────────────────┤
│ Event: PageView                                            │
│ Event ID: 6e16ff4b-d444-4228-aae1-9d348c734f4d            │
│ Time: [hace unos segundos]                                 │
└────────────────────────────────────────────────────────────┘
```

**Todos con el MISMO Event ID** ✅

---

## ❌ Si NO Funciona

### Error 1: No aparecen eventos en Test Events

**Posibles causas:**

1. **Access Token inválido o expirado**
   - Ve a `panel/.env`
   - Verifica que `FACEBOOK_ACCESS_TOKEN` tenga un valor largo (100+ caracteres)
   - Si está vacío o dice `YOUR_ACCESS_TOKEN`, genera un token nuevo

2. **Pixel ID incorrecto**
   - Verifica que `FACEBOOK_PIXEL_ID=1126842699347074` sea correcto
   - Comprueba que es el mismo Pixel que estás viendo en Test Events

3. **Servidor no está enviando a Facebook**
   - Revisa la consola del servidor (Terminal 1)
   - Si ves `❌ Error enviando evento a Facebook`, lee el mensaje de error

---

### Error 2: Error en consola del servidor

**Error de OAuth:**
```bash
❌ Error enviando evento a Facebook: {
  error: {
    message: "Invalid OAuth access token",
    type: "OAuthException",
    code: 190
  }
}
```

**Solución:** El Access Token expiró o es inválido. Genera un token nuevo:
1. Ve a: https://business.facebook.com/events_manager2/list/pixel/1126842699347074/settings
2. Busca **"Conversions API"**
3. Click en **"Generate Access Token"**
4. Copia el token
5. Actualiza `panel/.env`:
   ```bash
   FACEBOOK_ACCESS_TOKEN=EL_NUEVO_TOKEN
   ```
6. Reinicia el servidor del panel

---

**Error de permisos:**
```bash
❌ Error enviando evento a Facebook: {
  error: {
    message: "Insufficient permission",
    type: "FacebookApiException"
  }
}
```

**Solución:** El token no tiene permisos para enviar eventos.
1. Ve a Facebook Business Manager
2. Verifica que tu cuenta tenga permisos de **"Admin"** o **"Advertiser"** en el Pixel
3. Genera un token nuevo desde Events Manager

---

**Error de Pixel ID:**
```bash
❌ Error enviando evento a Facebook: {
  error: {
    message: "Invalid parameter",
    type: "FacebookApiException"
  }
}
```

**Solución:** El Pixel ID es incorrecto.
1. Ve a: https://business.facebook.com/events_manager2
2. Copia el Pixel ID correcto (número de 15-16 dígitos)
3. Actualiza `panel/.env`:
   ```bash
   FACEBOOK_PIXEL_ID=TU_PIXEL_ID_CORRECTO
   ```
4. Reinicia el servidor

---

### Error 3: Eventos aparecen duplicados en Test Events

**Causa:** El Facebook Pixel (navegador) y la Conversion API (servidor) están enviando el MISMO evento sin deduplicación.

**Esto es NORMAL** para eventos como PageView y ClickWhatsApp, porque:
- El Pixel los envía desde el navegador
- La Conversion API los envía desde el servidor

Facebook **automáticamente los deduplica** usando el `event_id`.

**Eventos que DEBEN aparecer duplicados:**
- PageView (Pixel + Conversion API)

**Eventos que aparecen SOLO desde Conversion API:**
- Contact (cuando marcas "Mensaje")
- Purchase (cuando marcas "Compra")

---

## 📊 Verificar Logs en el Panel

Además de Test Events, puedes revisar los logs en el panel:

1. Abre: http://localhost:3000
2. Scroll hasta **"📊 Logs de Facebook API"**

**Log exitoso:**
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
  },
  "events_received": 1
}
```

**Log con error:**
```json
{
  "timestamp": "2025-10-21T12:34:56.789Z",
  "event_id": "6e16ff4b-d444-4228-aae1-9d348c734f4d",
  "event_name": "Contact",
  "pixel_id": "1126842699347074",
  "status": "error",
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

---

## 🎯 Checklist Final

- [ ] Servidor del panel corriendo en http://localhost:3000
- [ ] Servidor de landing corriendo en http://localhost:4001
- [ ] Test Events abierto en Facebook
- [ ] Evento creado en la landing (pageview + whatsapp_click)
- [ ] Evento marcado como "Mensaje" en el panel
- [ ] Evento `Contact` aparece en Test Events ✅
- [ ] Evento marcado como "Compra" en el panel
- [ ] Evento `Purchase` aparece en Test Events ✅
- [ ] Logs del panel muestran `status: "success"`
- [ ] Todos los eventos tienen el mismo `event_id`

---

**Si TODOS los checks están ✅, tu Access Token funciona perfectamente.**

**Si alguno falla, revisa la sección "❌ Si NO Funciona" arriba.**

---

**Fecha:** 2025-10-21
**Versión:** 1.0
