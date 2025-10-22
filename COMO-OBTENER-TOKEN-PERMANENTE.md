# 🔐 Cómo Obtener un Token Permanente (System User)

## ❌ Problema Actual

Tienes un **Short-lived Access Token** que expira en 1-2 horas.

Cada vez que expira, tienes que:
1. Ir a Events Manager
2. Generar un token nuevo
3. Actualizar `.env`
4. Reiniciar el servidor

**Esto NO es práctico para producción.**

---

## ✅ Solución: System User Token

Un **System User** es una cuenta especial de Facebook Business Manager que:
- ✅ Genera tokens que **NO expiran**
- ✅ Perfectos para servidores y aplicaciones
- ✅ No dependen de una cuenta personal
- ✅ Más seguros y estables

---

## 📋 Guía Paso a Paso

### Paso 1: Accede a Facebook Business Manager

1. Ve a: **https://business.facebook.com/**
2. Inicia sesión con tu cuenta de Facebook
3. Selecciona tu cuenta de negocio

**Si NO tienes un Business Manager:**
- Crea uno en: https://business.facebook.com/create

---

### Paso 2: Ve a System Users

1. En el menú lateral, busca **"Business Settings"** (Configuración del Negocio)
   - O ve directo a: https://business.facebook.com/settings/

2. En el menú lateral izquierdo, busca **"Users"** → **"System Users"**
   - O ve directo a: https://business.facebook.com/settings/system-users

**Captura esperada:**
```
┌─────────────────────────────────────────────────────┐
│ Business Settings                                   │
├─────────────────────────────────────────────────────┤
│ Users                                               │
│  ├─ People                                          │
│  ├─ Partners                                        │
│  └─ System Users  ← AQUÍ                            │
│                                                     │
│ Accounts                                            │
│  ├─ Ad Accounts                                     │
│  ├─ Pages                                           │
│  └─ Pixels                                          │
└─────────────────────────────────────────────────────┘
```

---

### Paso 3: Crear un System User

1. Click en **"Add"** (Agregar) o **"Create System User"**

2. **Nombre del System User:**
   ```
   Conversions API - Tracking System
   ```
   (Puedes usar cualquier nombre descriptivo)

3. **Role (Rol):**
   - Selecciona: **"Admin"** (Administrador)
   - Esto le dará permisos completos para gestionar el Pixel

4. Click en **"Create System User"**

---

### Paso 4: Asignar el Pixel al System User

1. En la tabla de System Users, busca el que acabas de crear
2. Click en **"Add Assets"** (Agregar Activos) o **"Assign Assets"**

3. Selecciona **"Pixels"** (o "Data Sources")

4. Busca tu Pixel: **1126842699347074**

5. **Permisos necesarios:**
   - ✅ **Advertise** (Anunciar)
   - ✅ **Manage** (Gestionar)
   - ✅ **Analyze** (Analizar)

   **Marca TODOS los permisos disponibles para el Pixel.**

6. Click en **"Save Changes"** (Guardar Cambios)

---

### Paso 5: Generar el Access Token Permanente

1. En la tabla de System Users, busca tu System User
2. Click en **"Generate New Token"** (Generar Nuevo Token)

3. **Selecciona el App:**
   - Si aparece una lista de apps, selecciona la que esté asociada a tu Pixel
   - Si NO tienes una app, selecciona **"Business Manager"** o crea una app

**Si necesitas crear un App:**
- Ve a: https://developers.facebook.com/apps
- Click en **"Create App"**
- Tipo: **"Business"**
- Nombre: `Tracking System`
- Conecta el App a tu Business Manager

4. **Permisos del Token:**

   Selecciona estos permisos:

   - ✅ `ads_management` - Para enviar eventos de conversión
   - ✅ `business_management` - Para gestionar el Pixel
   - ✅ `ads_read` - Para leer datos de anuncios (opcional)

   **IMPORTANTE:** Asegúrate de seleccionar **`ads_management`** y **`business_management`**.

5. Click en **"Generate Token"**

---

### Paso 6: Copiar el Token

Facebook te mostrará el token generado:

```
EAABsbCS1iHgBOwZC4ZAGf6xR... (muy largo, ~200 caracteres)
```

**COPIA EL TOKEN COMPLETO** y guárdalo en un lugar seguro.

**⚠️ IMPORTANTE:**
- Este token **SOLO SE MUESTRA UNA VEZ**
- Si lo pierdes, tendrás que generar uno nuevo
- NO lo compartas públicamente

---

### Paso 7: Actualizar el .env

1. Abre el archivo `.env`:
   ```bash
   cd "/mnt/c/Users/NoxiePC/Desktop/Landing super pro( argenbet)/panel"
   nano .env
   ```
   (o ábrelo con tu editor favorito)

2. Reemplaza el valor de `FACEBOOK_ACCESS_TOKEN`:

   **ANTES:**
   ```bash
   FACEBOOK_ACCESS_TOKEN=EAAR7uPgFvj8BO2WoA8r9ZCZCtL70WDOs... (token antiguo de 1-2hs)
   ```

   **DESPUÉS:**
   ```bash
   FACEBOOK_ACCESS_TOKEN=EAABsbCS1iHgBOwZC4ZAGf6xR... (token nuevo permanente)
   ```

3. Guarda el archivo

---

### Paso 8: Reiniciar el Servidor

**Terminal del panel:**
```bash
# Detener el servidor actual (Ctrl+C)

# Reiniciar:
cd "/mnt/c/Users/NoxiePC/Desktop/Landing super pro( argenbet)/panel"
node server.js
```

**Deberías ver:**
```bash
🚀 Servidor corriendo en http://localhost:3000
📊 Panel CRM: http://localhost:3000

📝 Configuración actual:
   - Facebook Pixel ID: 1126842699347074
   - Facebook Access Token: ✅ Configurado
```

---

### Paso 9: Verificar que Funciona

#### Opción 1: Hacer una prueba rápida

1. Abre http://localhost:3000
2. Marca un evento como "Mensaje"
3. Ve a los logs del panel
4. Deberías ver `status: "success"`

#### Opción 2: Test Events de Facebook

1. Abre: https://business.facebook.com/events_manager2/list/pixel/1126842699347074/test_events
2. Selecciona **"From Server"**
3. Marca un evento como "Mensaje" en el panel
4. Deberías ver el evento `Contact` aparecer en tiempo real

---

## ✅ Confirmación

Si el evento aparece en Test Events, **tu token permanente funciona correctamente** ✅

**Este token NO expirará** (o expirará después de 60 días de inactividad, pero se renueva automáticamente cada vez que lo uses).

---

## 📊 Comparación de Tipos de Tokens

| Tipo | Duración | Uso | Recomendado Para |
|------|----------|-----|------------------|
| **Short-lived** | 1-2 horas | Testing rápido | Desarrollo |
| **Long-lived** | 60 días | Uso temporal | Staging |
| **System User** | Permanente* | Producción | **Producción** ✅ |

\* Los tokens de System User no expiran técnicamente, pero Facebook puede revocarlos si detecta actividad sospechosa o si el System User es eliminado.

---

## 🔒 Seguridad del Token

### ✅ Buenas Prácticas:

1. **NUNCA** pongas el token en el código frontend (`index.html`)
2. **NUNCA** lo subas a repositorios públicos (ya está en `.gitignore`)
3. **SOLO** guárdalo en `panel/.env` (backend)
4. **Usa HTTPS** en producción para encriptar las comunicaciones
5. **Renueva el token** periódicamente (cada 3-6 meses)

### ❌ Qué NO hacer:

- ❌ Compartir el token en chat/email
- ❌ Hardcodearlo en el código
- ❌ Usarlo en el frontend (JavaScript del navegador)
- ❌ Subirlo a GitHub sin `.gitignore`

---

## 🔄 Renovar el Token (Cada 3-6 meses)

Aunque el token de System User no expira, es buena práctica renovarlo periódicamente:

1. Ve a Business Settings → System Users
2. Busca tu System User
3. Click en **"Generate New Token"**
4. Selecciona los mismos permisos
5. Copia el nuevo token
6. Actualiza `.env`
7. Reinicia el servidor

---

## ❓ Preguntas Frecuentes

### ¿El token de System User expira?

**No**, técnicamente no expira. Pero Facebook puede revocarlo si:
- Detecta actividad sospechosa
- El System User es eliminado
- No se usa durante más de 60 días (en algunos casos)

**Recomendación:** Úsalo regularmente (tu sistema lo hace automáticamente cuando envías eventos).

---

### ¿Puedo tener múltiples System Users?

**Sí**, puedes crear múltiples System Users para diferentes propósitos:
- Uno para Conversions API
- Uno para análisis
- Uno para automatizaciones

---

### ¿Qué pasa si elimino el System User?

Si eliminas el System User, **todos sus tokens se revocan inmediatamente**.

Tu servidor empezará a recibir errores:
```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

**Solución:** Crea un nuevo System User y genera un token nuevo.

---

### ¿Puedo usar el mismo token en múltiples servidores?

**Sí**, puedes usar el mismo token en múltiples servidores siempre que:
- Todos usen el mismo Pixel
- Todos sean de tu propiedad
- Todos tengan `.env` con el mismo token

**Ejemplo:**
- Servidor de producción: usa el token
- Servidor de staging: usa el mismo token
- Servidor de desarrollo: usa el mismo token

---

### ¿Cómo sé si mi token es permanente?

**Revisa dónde lo generaste:**

| Fuente | Tipo de Token |
|--------|---------------|
| Events Manager → Test Events | Short-lived (1-2hs) ❌ |
| Events Manager → Conversions API Settings | Long-lived (60 días) ⚠️ |
| Business Settings → System Users | **Permanente** ✅ |

**Para estar 100% seguro:**
- Ve a Business Settings → System Users
- Busca tu System User
- Si tiene un token generado, es permanente

---

## 🔗 Enlaces Directos

1. **Business Settings:**
   https://business.facebook.com/settings/

2. **System Users:**
   https://business.facebook.com/settings/system-users

3. **Crear App (si necesitas):**
   https://developers.facebook.com/apps

4. **Documentación oficial de System Users:**
   https://developers.facebook.com/docs/marketing-api/system-users

5. **Documentación de Access Tokens:**
   https://developers.facebook.com/docs/facebook-login/guides/access-tokens

---

## 📝 Resumen

| Paso | Acción |
|------|--------|
| 1 | Ve a Business Settings → System Users |
| 2 | Crea un System User ("Conversions API - Tracking System") |
| 3 | Asigna el Pixel (1126842699347074) con permisos completos |
| 4 | Genera un token con permisos `ads_management` y `business_management` |
| 5 | Copia el token generado |
| 6 | Actualiza `panel/.env` con el nuevo token |
| 7 | Reinicia el servidor del panel |
| 8 | Verifica en Test Events que funciona |

---

**Este token NO EXPIRARÁ y es perfecto para producción.** ✅

---

**Fecha:** 2025-10-21
**Versión:** 1.0
