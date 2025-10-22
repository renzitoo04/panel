require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración
const DATA_FILE = path.join(__dirname, 'data', 'events.json');
const LOGS_FILE = path.join(__dirname, 'data', 'facebook_logs.json');
const CAMPAIGN_SPEND_FILE = path.join(__dirname, 'data', 'campaign_spend.json');
const ENV_FILE = path.join(__dirname, '.env');
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || 'YOUR_PIXEL_ID';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';
const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_TEST_EVENT_CODE = process.env.FACEBOOK_TEST_EVENT_CODE || null; // Opcional: Para validar eventos en modo test

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// FUNCIONES DE PERSISTENCIA
// ============================================

async function initDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        // Si el archivo no existe, crearlo con array vacío
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }

    // Inicializar archivo de logs
    try {
        await fs.access(LOGS_FILE);
    } catch {
        await fs.writeFile(LOGS_FILE, JSON.stringify([], null, 2));
    }

    // Inicializar archivo de gastos por campaña
    try {
        await fs.access(CAMPAIGN_SPEND_FILE);
    } catch {
        await fs.writeFile(CAMPAIGN_SPEND_FILE, JSON.stringify({}, null, 2));
    }
}

async function readEvents() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo eventos:', error);
        return [];
    }
}

async function writeEvents(events) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2));
    } catch (error) {
        console.error('Error escribiendo eventos:', error);
    }
}

async function readLogs() {
    try {
        const data = await fs.readFile(LOGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo logs:', error);
        return [];
    }
}

async function writeLogs(logs) {
    try {
        await fs.writeFile(LOGS_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error escribiendo logs:', error);
    }
}

async function addLog(logEntry) {
    const logs = await readLogs();
    logs.unshift(logEntry); // Agregar al inicio (más recientes primero)

    // Mantener solo los últimos 500 logs para no saturar
    if (logs.length > 500) {
        logs.splice(500);
    }

    await writeLogs(logs);
}

async function readCampaignSpend() {
    try {
        const data = await fs.readFile(CAMPAIGN_SPEND_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo gastos de campaña:', error);
        return {};
    }
}

async function writeCampaignSpend(spendData) {
    try {
        await fs.writeFile(CAMPAIGN_SPEND_FILE, JSON.stringify(spendData, null, 2));
    } catch (error) {
        console.error('Error escribiendo gastos de campaña:', error);
    }
}

// ============================================
// INTEGRACIÓN CON FACEBOOK CONVERSION API
// ============================================

async function sendToFacebookConversionAPI(eventId, eventName, eventData = {}) {
    // Construir URL base
    let url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PIXEL_ID}/events`;

    // Agregar test_event_code si está configurado (para validar eventos antes de producción)
    if (FACEBOOK_TEST_EVENT_CODE) {
        url += `?test_event_code=${FACEBOOK_TEST_EVENT_CODE}`;
    }

    const currentTime = Math.floor(Date.now() / 1000);

    // Preparar user_data con todos los datos disponibles
    const user_data = {
        client_user_agent: eventData.user_agent || 'unknown'
    };

    // Agregar IP si está disponible (mejora el match rate)
    if (eventData.client_ip) {
        user_data.client_ip_address = eventData.client_ip;
    }

    const payload = {
        data: [{
            event_name: eventName, // 'Contact' o 'Purchase'
            event_time: currentTime,
            event_id: eventId, // Para deduplicación con el pixel
            event_source_url: eventData.source_url || 'https://tudominio.com',
            action_source: 'website', // REQUERIDO por Facebook (website, app, phone_call, etc)
            user_data: user_data,
            custom_data: eventData.custom_data || {}
        }],
        access_token: FACEBOOK_ACCESS_TOKEN
    };

    const logEntry = {
        timestamp: new Date().toISOString(),
        event_id: eventId,
        event_name: eventName,
        pixel_id: FACEBOOK_PIXEL_ID,
        payload: {
            event_time: currentTime,
            custom_data: eventData.custom_data || {},
            source_url: eventData.source_url || 'https://tudominio.com'
        },
        status: 'pending'
    };

    try {
        const response = await axios.post(url, payload);
        console.log(`✅ Evento ${eventName} enviado a Facebook Conversion API:`, response.data);

        // Guardar log exitoso
        logEntry.status = 'success';
        logEntry.response = response.data;
        logEntry.events_received = response.data.events_received || 0;
        logEntry.messages = response.data.messages || [];

        await addLog(logEntry);

        return {
            success: true,
            data: response.data,
            events_received: response.data.events_received,
            messages: response.data.messages
        };
    } catch (error) {
        console.error('❌ Error enviando evento a Facebook:', error.response?.data || error.message);

        // Guardar log de error
        logEntry.status = 'error';
        logEntry.error = error.response?.data || error.message;

        await addLog(logEntry);

        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

// ============================================
// ESTADÍSTICAS Y MÉTRICAS
// ============================================

function calculateStats(events) {
    const total = events.length;
    const withMessage = events.filter(e => e.has_message).length;
    const withPurchase = events.filter(e => e.has_purchase).length;

    return {
        total_clicks: total,
        total_messages: withMessage,
        total_purchases: withPurchase,
        conversion_click_to_message: total > 0 ? ((withMessage / total) * 100).toFixed(2) : 0,
        conversion_message_to_purchase: withMessage > 0 ? ((withPurchase / withMessage) * 100).toFixed(2) : 0,
        conversion_click_to_purchase: total > 0 ? ((withPurchase / total) * 100).toFixed(2) : 0
    };
}

async function calculateCampaignStats(events) {
    const campaignSpend = await readCampaignSpend();
    const campaignGroups = {};

    // Agrupar eventos por campaña
    events.forEach(event => {
        const campaign = event.attribution?.utm_campaign || 'Sin campaña';

        if (!campaignGroups[campaign]) {
            campaignGroups[campaign] = {
                name: campaign,
                clicks: 0,
                messages: 0,
                purchases: 0,
                revenue: 0,
                spend: campaignSpend[campaign] || 0,
                roas: 0,
                cpl: 0,      // Cost Per Lead
                cpa: 0,      // Cost Per Acquisition
                margin: 0,   // Margen de ganancia
                closeRate: 0 // Tasa de cierre (Compras/Mensajes)
            };
        }

        campaignGroups[campaign].clicks++;
        if (event.has_message) campaignGroups[campaign].messages++;
        if (event.has_purchase) {
            campaignGroups[campaign].purchases++;
            campaignGroups[campaign].revenue += parseFloat(event.purchase_value) || 0;
        }
    });

    // Calcular todas las métricas por campaña
    Object.keys(campaignGroups).forEach(campaign => {
        const data = campaignGroups[campaign];

        // ROAS
        if (data.spend > 0) {
            data.roas = (data.revenue / data.spend).toFixed(2);
        } else {
            data.roas = data.revenue > 0 ? '∞' : '0.00';
        }

        // CPL (Cost Per Lead)
        if (data.messages > 0 && data.spend > 0) {
            data.cpl = (data.spend / data.messages).toFixed(2);
        } else {
            data.cpl = data.spend > 0 ? data.spend.toFixed(2) : '0.00';
        }

        // CPA (Cost Per Acquisition)
        if (data.purchases > 0 && data.spend > 0) {
            data.cpa = (data.spend / data.purchases).toFixed(2);
        } else {
            data.cpa = data.spend > 0 ? data.spend.toFixed(2) : '0.00';
        }

        // Margen de Ganancia
        data.margin = (data.revenue - data.spend).toFixed(2);

        // Tasa de Cierre (Close Rate)
        if (data.messages > 0) {
            data.closeRate = ((data.purchases / data.messages) * 100).toFixed(1);
        } else {
            data.closeRate = '0.0';
        }
    });

    return campaignGroups;
}

// ============================================
// RUTAS - API
// ============================================

// Función para obtener la IP real del usuario (considerando proxies)
function getClientIP(req) {
    // Intentar obtener IP de headers comunes (Cloudflare, proxies, etc.)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for puede tener múltiples IPs, tomamos la primera
        return forwarded.split(',')[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }

    // Fallback a la IP del socket
    return req.socket.remoteAddress || req.connection.remoteAddress;
}

// Endpoint para recibir tracking desde la landing
app.post('/api/track', async (req, res) => {
    const { event_id, event_type, timestamp, user_agent, referrer, attribution } = req.body;

    if (!event_id) {
        return res.status(400).json({ error: 'event_id es requerido' });
    }

    // Capturar IP del usuario
    const client_ip = getClientIP(req);

    const events = await readEvents();

    // Buscar si el evento ya existe
    let existingEvent = events.find(e => e.event_id === event_id);

    if (existingEvent) {
        // Actualizar evento existente
        if (event_type === 'whatsapp_click') {
            existingEvent.whatsapp_clicked = true;
            existingEvent.whatsapp_click_time = timestamp;
        }
        // Actualizar IP si no la tenía
        if (!existingEvent.client_ip) {
            existingEvent.client_ip = client_ip;
        }
        // Actualizar attribution si no la tenía
        if (!existingEvent.attribution && attribution) {
            existingEvent.attribution = attribution;
        }
    } else {
        // Crear nuevo evento
        events.push({
            event_id,
            created_at: timestamp,
            event_type,
            user_agent,
            referrer,
            client_ip, // ← IP del usuario
            attribution: attribution || {}, // ← UTM + fbclid + gclid
            whatsapp_clicked: event_type === 'whatsapp_click',
            whatsapp_click_time: event_type === 'whatsapp_click' ? timestamp : null,
            has_message: false,
            message_time: null,
            has_purchase: false,
            purchase_time: null,
            purchase_value: null
        });
    }

    await writeEvents(events);

    res.json({ success: true, event_id });
});

// Obtener todos los eventos
app.get('/api/events', async (req, res) => {
    const events = await readEvents();
    const stats = calculateStats(events);

    res.json({
        events: events.reverse(), // Más recientes primero
        stats
    });
});

// Obtener logs de Facebook
app.get('/api/logs', async (req, res) => {
    const logs = await readLogs();
    res.json({
        logs: logs.slice(0, 100) // Últimos 100 logs
    });
});

// Obtener estadísticas por campaña con ROAS
app.get('/api/campaigns/stats', async (req, res) => {
    const events = await readEvents();
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);
    const campaignStats = await calculateCampaignStats(clickedEvents);

    res.json({
        campaigns: campaignStats
    });
});

// Obtener gastos de campaña
app.get('/api/campaigns/spend', async (req, res) => {
    const spendData = await readCampaignSpend();
    res.json({
        spend: spendData
    });
});

// Establecer/actualizar gasto de una campaña
app.post('/api/campaigns/spend', async (req, res) => {
    const { campaign, amount, currency } = req.body;

    if (!campaign || !amount || isNaN(amount) || parseFloat(amount) < 0) {
        return res.status(400).json({ error: 'Campaña y monto válido son requeridos' });
    }

    const spendData = await readCampaignSpend();
    spendData[campaign] = parseFloat(amount);
    await writeCampaignSpend(spendData);

    res.json({
        success: true,
        campaign,
        amount: parseFloat(amount),
        currency: currency || 'USD'
    });
});

// Actualizar configuración de Facebook (Pixel ID y Access Token)
app.post('/api/settings/facebook', async (req, res) => {
    const { pixelId, accessToken } = req.body;

    // Validación
    if (!pixelId || !accessToken) {
        return res.status(400).json({
            success: false,
            error: 'Pixel ID y Access Token son requeridos'
        });
    }

    try {
        // Leer archivo .env actual
        let envContent = '';
        try {
            envContent = await fs.readFile(ENV_FILE, 'utf-8');
        } catch (error) {
            // Si no existe, crear uno nuevo
            envContent = '';
        }

        // Convertir a objeto
        const envLines = envContent.split('\n');
        const envVars = {};

        envLines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const separatorIndex = trimmedLine.indexOf('=');
                if (separatorIndex !== -1) {
                    const key = trimmedLine.substring(0, separatorIndex).trim();
                    const value = trimmedLine.substring(separatorIndex + 1).trim();
                    envVars[key] = value;
                }
            }
        });

        // Actualizar valores
        envVars['FACEBOOK_PIXEL_ID'] = pixelId;
        envVars['FACEBOOK_ACCESS_TOKEN'] = accessToken;

        // Si no existe PORT, agregarlo
        if (!envVars['PORT']) {
            envVars['PORT'] = '3000';
        }

        // Reconstruir archivo .env
        const newEnvContent = Object.keys(envVars)
            .map(key => `${key}=${envVars[key]}`)
            .join('\n') + '\n';

        // Escribir archivo .env
        await fs.writeFile(ENV_FILE, newEnvContent, 'utf-8');

        // Actualizar process.env en memoria (para no tener que reiniciar el servidor)
        process.env.FACEBOOK_PIXEL_ID = pixelId;
        process.env.FACEBOOK_ACCESS_TOKEN = accessToken;

        console.log('✅ Configuración de Facebook actualizada correctamente');
        console.log(`   - Nuevo Pixel ID: ${pixelId}`);
        console.log(`   - Access Token actualizado`);

        res.json({
            success: true,
            message: 'Configuración actualizada correctamente',
            pixelId: pixelId
        });

    } catch (error) {
        console.error('❌ Error actualizando configuración de Facebook:', error);
        res.status(500).json({
            success: false,
            error: 'Error al guardar la configuración: ' + error.message
        });
    }
});

// Marcar evento como "mensaje recibido"
app.post('/api/events/:eventId/message', async (req, res) => {
    const { eventId } = req.params;
    const events = await readEvents();

    const event = events.find(e => e.event_id === eventId);

    if (!event) {
        return res.status(404).json({ error: 'Evento no encontrado' });
    }

    if (event.has_message) {
        return res.status(400).json({ error: 'Este evento ya tiene un mensaje registrado' });
    }

    // Actualizar evento
    event.has_message = true;
    event.message_time = new Date().toISOString();

    await writeEvents(events);

    // Enviar a Facebook Conversion API
    const fbResult = await sendToFacebookConversionAPI(
        eventId,
        'Contact',
        {
            user_agent: event.user_agent,
            client_ip: event.client_ip, // ← IP del usuario
            source_url: 'whatsapp'
        }
    );

    res.json({
        success: true,
        event,
        facebook_api: fbResult
    });
});

// Marcar evento como "compra realizada"
app.post('/api/events/:eventId/purchase', async (req, res) => {
    const { eventId } = req.params;
    const { value, currency } = req.body;
    const events = await readEvents();

    const event = events.find(e => e.event_id === eventId);

    if (!event) {
        return res.status(404).json({ error: 'Evento no encontrado' });
    }

    if (event.has_purchase) {
        return res.status(400).json({ error: 'Este evento ya tiene una compra registrada' });
    }

    // VALIDACIÓN: Valor es obligatorio
    if (!value || isNaN(value) || parseFloat(value) <= 0) {
        return res.status(400).json({ error: 'El valor de la compra es obligatorio y debe ser mayor a 0' });
    }

    // Actualizar evento
    event.has_purchase = true;
    event.purchase_time = new Date().toISOString();
    event.purchase_value = value || 0;
    event.purchase_currency = currency || 'USD';

    await writeEvents(events);

    // Enviar a Facebook Conversion API
    const fbResult = await sendToFacebookConversionAPI(
        eventId,
        'Purchase',
        {
            user_agent: event.user_agent,
            client_ip: event.client_ip, // ← IP del usuario
            source_url: 'whatsapp',
            custom_data: {
                value: event.purchase_value,
                currency: event.purchase_currency,
                content_name: 'Primer Depósito Casino', // Descripción del producto
                content_type: 'product', // Tipo estándar de Facebook
                num_items: 1 // Cantidad de items
            }
        }
    );

    res.json({
        success: true,
        event,
        facebook_api: fbResult
    });
});

// ============================================
// RUTAS - PANEL WEB
// ============================================

app.get('/', async (req, res) => {
    const events = await readEvents();

    // Filtrar solo eventos con click en WhatsApp
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);

    const stats = calculateStats(clickedEvents);
    const campaignStats = await calculateCampaignStats(clickedEvents);
    const logs = await readLogs();

    res.render('dashboard', {
        events: clickedEvents.reverse(), // Más recientes primero, solo con click
        stats,
        campaignStats,
        logs: logs.slice(0, 50) // Últimos 50 logs
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

async function startServer() {
    await initDataFile();

    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📊 Panel CRM: http://localhost:${PORT}`);
        console.log(`\n📝 Configuración actual:`);
        console.log(`   - Facebook Pixel ID: ${FACEBOOK_PIXEL_ID}`);
        console.log(`   - Facebook Access Token: ${FACEBOOK_ACCESS_TOKEN ? '✅ Configurado' : '❌ No configurado'}`);
        console.log(`   - Test Events API: ${FACEBOOK_TEST_EVENT_CODE ? '🧪 MODO TEST ACTIVO' : '✅ Modo producción'}`);
        console.log(`\n💡 Recuerda configurar las variables de entorno en el archivo .env\n`);
    });
}

startServer();
