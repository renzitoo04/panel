# 📁 Estructura del Proyecto - Sistema de Tracking

## ✅ Archivos Creados

```
Landing super pro( argenbet)/
│
├── 📄 .env.example                    # Plantilla de configuración
├── 📄 QUICK-START.md                  # Guía de inicio rápido
├── 📄 README-TRACKING-SYSTEM.md       # Documentación completa
├── 📄 ESTRUCTURA-PROYECTO.md          # Este archivo
│
├── 📁 landing/                        # FRONTEND (Landing Page)
│   ├── index.html                     # Página principal con Facebook Pixel
│   ├── style.css                      # Estilos de la landing
│   └── script.js                      # Tracking y generación de event_id
│
└── 📁 panel/                          # BACKEND (Panel CRM)
    ├── package.json                   # Dependencias del proyecto
    ├── server.js                      # Servidor Express + API + Facebook CAPI
    ├── .gitignore                     # Archivos a ignorar en Git
    │
    ├── 📁 data/
    │   └── events.json                # Base de datos (JSON)
    │
    ├── 📁 public/
    │   └── style.css                  # Estilos del panel CRM
    │
    └── 📁 views/
        └── dashboard.ejs              # Vista del panel con tabla y formularios
```

---

## 🎯 Funcionalidades Implementadas

### 🖥️ FRONTEND (Landing Page)

✅ **index.html**
- Landing page con diseño atractivo
- Facebook Pixel integrado
- Botón de WhatsApp destacado
- Responsive (mobile-first)

✅ **script.js**
- Generación automática de event_id (UUID v4)
- Envío de eventos a Facebook Pixel con event_id
- Registro de eventos en el backend
- Redirección a WhatsApp con event_id en el mensaje
- Manejo de errores

✅ **style.css**
- Diseño moderno con gradientes
- Animaciones y transiciones
- Completamente responsive

---

### 🗃️ BACKEND (Panel CRM)

✅ **server.js**
- API REST completa
- Sistema de persistencia en JSON
- Integración con Facebook Conversion API
- Endpoints para tracking y gestión de eventos
- Cálculo automático de estadísticas
- Envío de eventos Contact y Purchase a Facebook

✅ **dashboard.ejs**
- Panel CRM completo
- Tabla de eventos con colores por estado
- Formularios para marcar mensajes y compras
- Estadísticas en tiempo real
- Métricas de conversión
- Auto-refresh cada 30 segundos
- Sistema de notificaciones

✅ **API Endpoints**

| Método | Endpoint | Función |
|--------|----------|---------|
| POST | `/api/track` | Registrar evento desde landing |
| GET | `/api/events` | Obtener todos los eventos |
| POST | `/api/events/:id/message` | Marcar como mensaje recibido |
| POST | `/api/events/:id/purchase` | Marcar como compra realizada |
| GET | `/` | Ver panel CRM |

---

## 🔄 Flujo de Datos

```
┌─────────────────┐
│   VISITANTE     │
│  entra a la     │
│  landing page   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  1. Se genera event_id único (UUID) │
│  2. Se envía PageView a FB Pixel    │
│  3. Se registra en el backend       │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Usuario hace clic en    │
│  botón de WhatsApp       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  1. Evento "ClickWhatsApp" a Pixel   │
│  2. Redirige a WhatsApp con event_id│
│  3. Mensaje: "Código: abc-123..."    │
└────────┬─────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Cliente escribe por    │
│  WhatsApp (manual)      │
└────────┬────────────────┘
         │
         ▼
┌───────────────────────────────────────┐
│  VENDEDOR copia el event_id          │
│  y lo marca en el panel CRM          │
└────────┬──────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  1. Backend actualiza el estado       │
│  2. Envía evento "Contact" a FB CAPI  │
│  3. Facebook deduplica con Pixel      │
└────────┬───────────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Cliente compra          │
│  (si convierte)          │
└────────┬─────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  VENDEDOR marca como compra en panel  │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  1. Backend actualiza el estado       │
│  2. Envía evento "Purchase" a FB CAPI │
│  3. Facebook aprende y optimiza       │
└───────────────────────────────────────┘
```

---

## 📊 Estadísticas que Calcula

El sistema calcula automáticamente:

1. **Total de clicks**: Cuántas personas hicieron clic en WhatsApp
2. **Total de mensajes**: Cuántos te escribieron realmente
3. **Total de compras**: Cuántos compraron
4. **Conversión Click → Mensaje**: Porcentaje
5. **Conversión Mensaje → Compra**: Porcentaje
6. **Conversión Click → Compra**: Porcentaje (métrica principal)

---

## 🎨 Sistema de Colores en el Panel

| Color | Estado | Significado |
|-------|--------|-------------|
| 🩶 Gris | Pageview | Solo visitó la página |
| 🔵 Azul | Click | Hizo clic en WhatsApp |
| 🟡 Amarillo | Mensaje | Te escribió por WhatsApp |
| 🟢 Verde | Compra | ¡Compró! 🎉 |

---

## 🔐 Seguridad

✅ Event ID no es visible para el usuario
✅ Access Token en variables de entorno
✅ .gitignore configurado para proteger datos sensibles
✅ CORS configurado para seguridad
⚠️ Recomendado agregar autenticación en producción

---

## 🚀 Tecnologías Utilizadas

### Frontend
- HTML5
- CSS3 (Flexbox, Grid)
- JavaScript (ES6+)
- UUID v4 (vía CDN)
- Facebook Pixel

### Backend
- Node.js
- Express.js
- EJS (templating)
- Axios (HTTP client)
- Facebook Conversion API
- JSON (persistencia)

---

## 📝 Próximos Pasos

1. **Configurar las credenciales** (ver QUICK-START.md)
2. **Instalar dependencias** del panel
3. **Iniciar el servidor** y probar
4. **Personalizar** textos y diseño
5. **Deploy** a producción

---

## 🆘 Ayuda Rápida

| Problema | Solución |
|----------|----------|
| El backend no arranca | `cd panel && npm install && npm start` |
| Evento no se registra | Verifica URL en `landing/script.js` |
| FB no recibe eventos | Verifica Pixel ID y Access Token |
| WhatsApp no abre | Verifica formato del número (sin +) |

---

## 📚 Documentación

- **Inicio rápido**: [QUICK-START.md](./QUICK-START.md)
- **Documentación completa**: [README-TRACKING-SYSTEM.md](./README-TRACKING-SYSTEM.md)
- **Facebook Pixel**: https://developers.facebook.com/docs/meta-pixel
- **Conversion API**: https://developers.facebook.com/docs/marketing-api/conversions-api

---

✨ **Sistema completo y listo para usar!**
