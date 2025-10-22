# 📚 Cómo Funciona el Event ID de Facebook

## 🎯 Qué es el Event ID

El **Event ID** es un parámetro que Facebook usa para:

1. **Deduplicar** eventos que llegan tanto del Pixel (navegador) como de la Conversion API (servidor)
2. **Vincular** múltiples eventos del mismo usuario (PageView → Click → Contact → Purchase)
3. **Atribuir** correctamente las conversiones a la campaña/ad correcta

## 📖 Documentación Oficial

**Facebook Pixel - eventID parameter:**
https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking#deduplication

**Conversion API - event_id:**
https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event

---

## 🔍 Cómo lo Implementamos

### 1️⃣ Frontend - Facebook Pixel

**Archivo:** `index.html` - Línea 354

```javascript
function fbEvent(name) {
    if (typeof fbq !== 'undefined') {
        fbq('track', name, {}, { eventID: getEventId() });
        //                      ^^^^^^^^^^^^^^^^^^^^^^^^
        //                      TERCER PARÁMETRO
    }
}
```

**Sintaxis oficial de Facebook Pixel:**
```javascript
fbq('track', 'EventName', {parameters}, {eventID: 'unique-id'});
//           ^^^^^^^^^^^   ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^
//           Nombre        Custom Data   Event ID (opcional)
```

**Ejemplo real:**
```javascript
fbq('track', 'PageView', {}, { eventID: '6e16ff4b-d444-4228-aae1-9d348c734f4d' });
```

**Lo que Facebook recibe:**
```json
{
  "event_name": "PageView",
  "event_id": "6e16ff4b-d444-4228-aae1-9d348c734f4d",
  "event_time": 1634567890,
  "user_data": {...},
  "source": "browser"
}
```

---

### 2️⃣ Backend - Facebook Conversion API

**Archivo:** `panel/server.js` - Línea 104-117

```javascript
const payload = {
    data: [{
        event_name: eventName, // 'Contact' o 'Purchase'
        event_time: currentTime,
        event_id: eventId, // ← MISMO ID que el Pixel
        event_source_url: eventData.source_url || 'https://tudominio.com',
        user_data: {
            client_user_agent: eventData.user_agent || 'unknown'
        },
        custom_data: eventData.custom_data || {}
    }],
    access_token: FACEBOOK_ACCESS_TOKEN
};
```

**Lo que Facebook recibe:**
```json
{
  "data": [{
    "event_name": "Contact",
    "event_id": "6e16ff4b-d444-4228-aae1-9d348c734f4d",
    "event_time": 1634567895,
    "user_data": {...},
    "source": "server"
  }],
  "access_token": "..."
}
```

---

## 🔄 Deduplicación en Acción

### Escenario: Usuario hace click en WhatsApp

**Facebook Pixel envía (desde el navegador):**
```json
{
  "event_name": "ClickWhatsApp",
  "event_id": "6e16ff4b-d444-4228-aae1-9d348c734f4d",
  "event_time": 1634567890
}
```

**Conversion API envía (desde el servidor):**
```json
{
  "event_name": "Contact",
  "event_id": "6e16ff4b-d444-4228-aae1-9d348c734f4d",
  "event_time": 1634567895
}
```

**Facebook detecta:**
- ✅ MISMO event_id: `6e16ff4b-d444-4228-aae1-9d348c734f4d`
- ✅ Ambos eventos son del MISMO usuario
- ✅ Los vincula en el funnel de conversión

---

## 📊 Cómo Facebook Ve los Eventos

### Lead: 6e16ff4b-d444-4228-aae1-9d348c734f4d

```
Timeline de eventos:
┌─────────────────────────────────────────────────────────────┐
│ 00:00  PageView        (Pixel + Conversion API)            │
│        event_id: 6e16ff4b...                                │
│        ├─ Pixel envía desde navegador                      │
│        └─ Conversion API envía desde servidor              │
│        → Facebook DEDUPLICA (cuenta como 1 solo evento)    │
├─────────────────────────────────────────────────────────────┤
│ 00:05  ClickWhatsApp   (Solo Pixel)                        │
│        event_id: 6e16ff4b...                                │
│        └─ Pixel envía desde navegador                      │
├─────────────────────────────────────────────────────────────┤
│ 00:10  Contact         (Solo Conversion API)               │
│        event_id: 6e16ff4b...                                │
│        └─ Conversion API envía cuando marcas "Mensaje"     │
├─────────────────────────────────────────────────────────────┤
│ 01:00  Purchase        (Solo Conversion API)               │
│        event_id: 6e16ff4b...                                │
│        └─ Conversion API envía cuando marcas "Compra"      │
│        custom_data: { value: 100, currency: 'USD' }        │
└─────────────────────────────────────────────────────────────┘
```

**Facebook vincula TODO porque:**
- ✅ MISMO `event_id` en todos los eventos
- ✅ Sabe que es el mismo usuario
- ✅ Atribuye la venta a la campaña/ad correcta

---

## 🎯 Por Qué Funciona

### El UUID que generamos NO es inventado

El UUID (`6e16ff4b-d444-4228-aae1-9d348c734f4d`) es:

1. **Único** - No se repetirá nunca
2. **Generado en el cliente** - Persiste durante toda la sesión
3. **Enviado a Facebook Pixel** - En el parámetro `eventID`
4. **Enviado a Conversion API** - En el campo `event_id`
5. **Usado por Facebook** - Para vincular y deduplicar eventos

### Facebook NO necesita un "Event ID especial"

Facebook acepta CUALQUIER string único como Event ID:
- ✅ UUID v4: `6e16ff4b-d444-4228-aae1-9d348c734f4d`
- ✅ Timestamp + Random: `1634567890-abc123`
- ✅ Hash: `sha256(user_data)`

**Lo ÚNICO que importa:**
- Que sea ÚNICO por sesión
- Que sea el MISMO en Pixel y Conversion API

---

## 📝 Ejemplo Completo del Flujo

### 1. Usuario entra a la landing

```javascript
// Frontend (index.html)
const eventId = generateUUID();  // "6e16ff4b-d444-4228-aae1-9d348c734f4d"
```

### 2. Se envía PageView

```javascript
// Frontend - Facebook Pixel
fbq('track', 'PageView', {}, { eventID: '6e16ff4b...' });

// Backend - Panel recibe y guarda
{
  event_id: '6e16ff4b...',
  event_type: 'pageview'
}
```

### 3. Usuario hace click en WhatsApp

```javascript
// Frontend - Facebook Pixel
fbq('track', 'ClickWhatsApp', {}, { eventID: '6e16ff4b...' });

// Backend - Panel actualiza
{
  event_id: '6e16ff4b...',
  whatsapp_clicked: true
}
```

### 4. TÚ marcas "Mensaje" en el panel

```javascript
// Backend - Conversion API
POST https://graph.facebook.com/v18.0/1126842699347074/events
{
  data: [{
    event_name: 'Contact',
    event_id: '6e16ff4b...',  // ← MISMO ID
    event_time: 1634567895
  }],
  access_token: '...'
}
```

### 5. TÚ marcas "Compra" en el panel

```javascript
// Backend - Conversion API
POST https://graph.facebook.com/v18.0/1126842699347074/events
{
  data: [{
    event_name: 'Purchase',
    event_id: '6e16ff4b...',  // ← MISMO ID
    event_time: 1634567900,
    custom_data: {
      value: 100,
      currency: 'USD'
    }
  }],
  access_token: '...'
}
```

---

## ✅ Confirmación

### Cómo saber que funciona:

1. **Facebook Events Manager**
   - Ve a: https://business.facebook.com/events_manager2/list/pixel/
   - Busca tu Pixel ID: `1126842699347074`
   - Verás los eventos con el mismo `event_id`

2. **Logs del panel**
   - Archivo: `panel/data/facebook_logs.json`
   - Verás el `event_id` en cada request

3. **Consola del navegador**
   - F12 → Consola
   - Verás: `🆔 Event ID: 6e16ff4b...`

---

## 🔗 Referencias Oficiales de Facebook

1. **Pixel - Event ID parameter:**
   https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking#deduplication

2. **Conversion API - event_id field:**
   https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event#event-id

3. **Deduplication Best Practices:**
   https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events

---

## 🎯 Conclusión

El Event ID que generamos (`6e16ff4b-d444-4228-aae1-9d348c734f4d`) **ES** el Event ID que Facebook usa porque:

1. ✅ Lo enviamos en el parámetro `eventID` del Pixel
2. ✅ Lo enviamos en el campo `event_id` de la Conversion API
3. ✅ Facebook lo recibe y lo usa para vincular eventos
4. ✅ Está documentado en la API oficial de Facebook

**No hay un "Event ID especial de Facebook".** Cualquier UUID único sirve, siempre que sea el MISMO en Pixel y Conversion API.
