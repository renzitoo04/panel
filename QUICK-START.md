# 🚀 Guía de Inicio Rápido

## ⚡ Configuración en 5 minutos

### Paso 1: Instalar dependencias del panel

```bash
cd panel
npm install
```

### Paso 2: Configurar variables de entorno

Edita el archivo `.env` en la raíz del proyecto:

```env
PORT=3000
FACEBOOK_PIXEL_ID=1126842699347074
FACEBOOK_ACCESS_TOKEN=TU_TOKEN_AQUI
```

### Paso 3: Configurar WhatsApp

Edita `landing/script.js` (línea 2):

```javascript
whatsappNumber: '5491123456789',  // ← CAMBIAR por tu número
```

### Paso 4: Configurar Pixel en la landing

Edita `landing/index.html` (líneas 12 y 18):

```html
fbq('init', '1126842699347074');  // ← Ya está configurado
```

### Paso 5: Iniciar el servidor

```bash
cd panel
npm start
```

✅ Panel CRM: http://localhost:3000

### Paso 6: Abrir la landing

Abre `landing/index.html` en tu navegador o súbelo a tu hosting.

---

## 🎯 ¿Cómo funciona?

### Para los visitantes:

1. Entran a tu landing
2. Hacen clic en el botón de WhatsApp
3. Se les abre WhatsApp con un mensaje que incluye un código único

**Ejemplo de mensaje:**
```
¡Hola! Vi la promoción. Código de seguimiento: 038d3f7c-bb9c-41fc-9a30-c08ce7c84e9f
```

### Para ti (el vendedor):

1. Recibes el mensaje de WhatsApp
2. Copias el código de seguimiento
3. Lo pegas en el panel CRM (http://localhost:3000)
4. Marcas si:
   - Te escribieron por WhatsApp → Botón "Marcar como mensaje"
   - Realizaron una compra → Botón "Marcar como compra"

### Para Facebook:

- Aprende automáticamente qué usuarios convierten
- Optimiza tus anuncios para mostrarlos a personas similares
- Mejora el ROAS (retorno de inversión publicitaria)

---

## 📊 Métricas que verás

El panel te mostrará:

- **Clicks totales**: Cuántas personas hicieron clic en WhatsApp
- **Mensajes**: Cuántos te escribieron realmente
- **Compras**: Cuántos compraron
- **Conversión total**: De 100 clicks, cuántos compraron

---

## ⚠️ Importante

### Número de WhatsApp

Formato correcto (sin + ni espacios):

- ✅ Argentina: `5491123456789`
- ✅ México: `521234567890`
- ✅ España: `34612345678`
- ❌ Incorrecto: `+54 911 2345 6789`

### Facebook Access Token

Lo obtienes en: [Facebook Business Manager](https://business.facebook.com)
→ Configuración del sistema → Tokens de acceso

Permisos necesarios:
- `ads_management`
- `business_management`

---

## 🎨 Personalizar el mensaje de WhatsApp

Edita `landing/script.js` (línea 7):

```javascript
defaultMessage: 'TU MENSAJE AQUÍ. Código: '
```

Ejemplos:
- `'¡Hola! Quiero info sobre la promo. Mi código: '`
- `'Hola, vi el anuncio. Código de consulta: '`
- `'Quiero aprovechar la oferta. ID: '`

---

## 🔧 Solución rápida de problemas

### El backend no arranca

```bash
cd panel
npm install
npm start
```

### El evento no se registra

1. Abre la consola del navegador (F12)
2. Busca errores en la pestaña "Console"
3. Verifica que `backendUrl` en `landing/script.js` sea correcto

### Facebook no recibe eventos

1. Verifica el Pixel ID en `landing/index.html`
2. Verifica el Access Token en `.env`
3. Mira los logs del servidor (terminal donde corre `npm start`)

---

## 📖 Documentación completa

Para más detalles, lee: [README-TRACKING-SYSTEM.md](./README-TRACKING-SYSTEM.md)

---

✨ **¡Listo! Ya puedes empezar a trackear tus conversiones de WhatsApp en Facebook.**
