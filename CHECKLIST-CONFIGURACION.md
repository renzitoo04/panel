# ✅ Checklist de Configuración

## Para empezar a usar el sistema necesitas configurar 4 cosas:

---

### 1️⃣ Instalar dependencias del panel

```bash
cd panel
npm install
```

**Tiempo estimado:** 1-2 minutos

---

### 2️⃣ Configurar variables de entorno

Edita el archivo `.env` en la **raíz del proyecto** (ya existe):

```env
PORT=3000
FACEBOOK_PIXEL_ID=1126842699347074
FACEBOOK_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI
```

**Qué cambiar:**
- `FACEBOOK_ACCESS_TOKEN`: Reemplazar con tu token real de Facebook

**¿Cómo obtener el Access Token?**
1. Ve a [Facebook Business Manager](https://business.facebook.com)
2. Navega a **Configuración del sistema** → **Tokens de acceso**
3. Genera un token con permisos: `ads_management` y `business_management`
4. Copia el token (comienza con `EAA...`)
5. Pégalo en `.env`

**Nota:** El Pixel ID ya está configurado (1126842699347074)

---

### 3️⃣ Configurar número de WhatsApp

Edita `landing/script.js` (línea 6):

```javascript
const CONFIG = {
    // REEMPLAZAR con tu número de WhatsApp (incluye código de país, sin +)
    // Ejemplo: 5491123456789 para Argentina
    whatsappNumber: '5491123456789',  // ← CAMBIAR ESTO
```

**Formato correcto:**
- ✅ Argentina: `5491123456789`
- ✅ México: `521234567890`
- ✅ España: `34612345678`
- ❌ Incorrecto: `+54 911 2345 6789`

---

### 4️⃣ Verificar Pixel ID en la landing (OPCIONAL)

El Pixel ID ya está configurado en `landing/index.html` (línea 12):

```javascript
fbq('init', '1126842699347074');  // Ya está configurado
```

Si quieres usar otro Pixel ID, cámbialo en 2 lugares:
- Línea 12: `fbq('init', 'TU_PIXEL_ID');`
- Línea 18: `src="...?id=TU_PIXEL_ID..."`

---

## 🚀 Iniciar el sistema

Una vez configurado lo anterior:

### 1. Iniciar el servidor (panel/backend):
```bash
cd panel
npm start
```

Verás:
```
🚀 Servidor corriendo en http://localhost:3000
📊 Panel CRM: http://localhost:3000
```

### 2. Abrir la landing:

**Opción A - Local (para pruebas):**
- Abre `landing/index.html` en tu navegador
- O usa: `file:///ruta/a/landing/index.html`

**Opción B - Con servidor local:**
```bash
# En la carpeta raíz
npx http-server landing -p 8080
```
Luego ve a: http://localhost:8080

**Opción C - Subir a hosting:**
- Sube los archivos de `landing/` a Netlify, Vercel, o tu hosting
- Actualiza `landing/script.js` línea 10:
  ```javascript
  backendUrl: 'https://tu-servidor-backend.com'
  ```

---

## 🧪 Probar que funciona

### Test 1: Panel CRM
1. Ve a http://localhost:3000
2. Deberías ver el panel con estadísticas en 0

### Test 2: Landing + Tracking
1. Abre `landing/index.html` en el navegador
2. Haz clic en el botón de WhatsApp
3. Verifica que se abre WhatsApp con un mensaje como:
   ```
   ¡Hola! Vi la promoción. Código de seguimiento: abc123-def456...
   ```
4. Vuelve al panel (http://localhost:3000)
5. Deberías ver 1 evento en la tabla

### Test 3: Registrar mensaje
1. Copia el código del mensaje de WhatsApp
2. En el panel, pega el código en "Registrar mensaje recibido"
3. Click en "Marcar como mensaje"
4. Verás:
   - Notificación con detalles de Facebook
   - El evento cambia a amarillo 🟡
   - Un nuevo log en la sección de logs

### Test 4: Registrar compra
1. Usa el mismo código
2. Pega en "Registrar compra realizada"
3. Opcional: ingresa valor (ej: 100)
4. Click en "Marcar como compra"
5. Verás:
   - Notificación con valor
   - El evento cambia a verde 🟢
   - Nuevo log de Purchase

---

## 📝 Resumen

### Lo que YA está configurado:
- ✅ Facebook Pixel ID: 1126842699347074
- ✅ Estructura de archivos
- ✅ Código completo
- ✅ Base de datos (JSON)

### Lo que DEBES configurar:
- ⚠️ Facebook Access Token (en `.env`)
- ⚠️ Número de WhatsApp (en `landing/script.js`)
- ⚠️ Instalar dependencias (`npm install`)

### Tiempo total de configuración: **~5 minutos**

---

## ⚠️ Solución rápida de problemas

### Error: "Cannot find module 'express'"
```bash
cd panel
npm install
```

### Error: "ENOENT: no such file or directory, open '.env'"
- Verifica que el archivo `.env` esté en la raíz del proyecto
- Si no existe, crea uno basado en `.env.example`

### El evento no se registra en el panel
- Verifica que el servidor esté corriendo
- Abre la consola del navegador (F12) y busca errores
- Verifica que `backendUrl` en `landing/script.js` sea `http://localhost:3000`

### WhatsApp no se abre
- Verifica el formato del número (sin + ni espacios)
- Verifica que el número incluya código de país

### Facebook no recibe eventos
- Verifica que el Access Token sea válido
- Revisa los logs del servidor
- Mira la sección de logs en el panel para ver errores

---

## 📞 ¿Listo para empezar?

Sigue estos pasos en orden:

1. ✅ `cd panel && npm install`
2. ✅ Editar `.env` con tu Access Token
3. ✅ Editar `landing/script.js` con tu número de WhatsApp
4. ✅ `npm start` en la carpeta panel
5. ✅ Abrir `landing/index.html` en el navegador
6. ✅ Hacer una prueba completa

---

✨ **Una vez configurado, el sistema funciona 100% automáticamente!**
