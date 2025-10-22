import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import {
  upsertEventByEventId,
  updateEvent,
  getEvents,
  getEventStats,
    getEventByEventId,
  upsertCampaignSpend,
  getAllCampaignSpend
} from './lib/database.js';

// also import landing settings helpers
import { upsertLandingSettings, getLandingSettings, deleteLandingSettings } from './lib/database.js';
import { getPanelNotes, upsertPanelNotes, getPanelTasks, upsertPanelTasks } from './lib/database.js';


// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración
const DATA_FILE = path.join(__dirname, 'data', 'events.json');
const LOGS_FILE = path.join(__dirname, 'data', 'facebook_logs.json');
const CAMPAIGN_SPEND_FILE = path.join(__dirname, 'data', 'campaign_spend.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const LANDINGS_FILE = path.join(__dirname, 'data', 'landings.json');
const WHATSAPP_ROTATION_FILE = path.join(__dirname, 'data', 'whatsapp_rotation.json');
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
app.set('view cache', false); // Deshabilitar cache de EJS en desarrollo
app.set('trust proxy', 1); // Confiar en proxies como LocalTunnel
app.use(express.static(path.join(__dirname, 'public')));


// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'argenbet-secret-key-2025-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax', // Permite cookies a través de proxies como LocalTunnel
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    },
    proxy: true // Necesario para LocalTunnel y proxies reversos
}));

// ============================================
// SISTEMA DE CACHÉ EN MEMORIA
// ============================================

// Configuración del caché
const CACHE_DURATION = 30000; // 30 segundos

// Almacenamiento de caché
const cache = {
    events: {
        data: null,
        lastUpdate: 0,
        map: null // Map para búsquedas O(1)
    },
    logs: {
        data: null,
        lastUpdate: 0
    },
    campaignSpend: {
        data: null,
        lastUpdate: 0
    }
};

// Función para verificar si el caché es válido
function isCacheValid(cacheKey) {
    return cache[cacheKey].data !== null &&
           (Date.now() - cache[cacheKey].lastUpdate) < CACHE_DURATION;
}

// Función para actualizar caché
function updateCache(cacheKey, data) {
    cache[cacheKey].data = data;
    cache[cacheKey].lastUpdate = Date.now();

    // Si es events, también crear Map para búsquedas rápidas
    if (cacheKey === 'events' && Array.isArray(data)) {
        cache[cacheKey].map = new Map(data.map(e => [e.event_id, e]));
    }
}

// Función para invalidar caché
function invalidateCache(cacheKey) {
    cache[cacheKey].data = null;
    cache[cacheKey].lastUpdate = 0;
    if (cacheKey === 'events') {
        cache[cacheKey].map = null;
    }
}

// Función para búsqueda rápida de eventos por ID (O(1) en lugar de O(n))
function findEventById(events, eventId) {
    // Si hay Map en caché, usar búsqueda O(1)
    if (cache.events.map && isCacheValid('events')) {
        return cache.events.map.get(eventId);
    }

    // Fallback a búsqueda lineal si no hay caché
    return events.find(e => e.event_id === eventId);
}

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
    // Verificar si hay caché válido
    if (isCacheValid('events')) {
        return cache.events.data;
    }

    // Si no hay caché, leer del disco
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        const events = JSON.parse(data);

        // Actualizar caché
        updateCache('events', events);

        return events;
    } catch (error) {
        console.error('Error leyendo eventos:', error);
        return [];
    }
}

async function writeEvents(events) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2));

        // Actualizar caché después de escribir
        updateCache('events', events);
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

// Funciones para multi-landing
async function readLandings() {
    try {
        const data = await fs.readFile(LANDINGS_FILE, 'utf-8');
        const parsed = JSON.parse(data);

        // Si por alguna razón el archivo contiene un array (por versiones antiguas), convertirlo
        if (Array.isArray(parsed)) {
            // Si está vacío, devolver estructura por defecto
            if (parsed.length === 0) {
                return { default: { id: 'default', name: 'Default Landing', pixelId: FACEBOOK_PIXEL_ID, accessToken: FACEBOOK_ACCESS_TOKEN, active: true } };
            }
            // Si es un array de landings con campo 'id', convertir a map { id: landing }
            const obj = {};
            parsed.forEach(item => {
                if (item && item.id) obj[item.id] = item;
            });
            // Si no pudimos mapear ninguno, devolver default
            if (Object.keys(obj).length === 0) {
                return { default: { id: 'default', name: 'Default Landing', pixelId: FACEBOOK_PIXEL_ID, accessToken: FACEBOOK_ACCESS_TOKEN, active: true } };
            }
            return obj;
        }

        // Si no es objeto, devolver default
        if (!parsed || typeof parsed !== 'object') {
            return { default: { id: 'default', name: 'Default Landing', pixelId: FACEBOOK_PIXEL_ID, accessToken: FACEBOOK_ACCESS_TOKEN, active: true } };
        }

        return parsed;
    } catch (error) {
        console.error('Error leyendo landings:', error);
        return { default: { id: 'default', name: 'Default Landing', pixelId: FACEBOOK_PIXEL_ID, accessToken: FACEBOOK_ACCESS_TOKEN, active: true } };
    }
}

function getCurrentLandingConfig(req) {
    // Obtener el landing_id de la sesión o usar 'default'
    const landingId = req.session.landingId || 'default';
    return { landingId };
}

async function getLandingCredentials(landingId) {
    const landings = await readLandings();
    const landing = landings[landingId] || landings['default'];
    return {
        pixelId: landing.pixelId || FACEBOOK_PIXEL_ID,
        accessToken: landing.accessToken || FACEBOOK_ACCESS_TOKEN
    };
}

async function writeLandings(landings) {
    try {
        // Asegurar que escribimos un objeto mapeado por id.
        let toWrite = landings;
        if (Array.isArray(landings)) {
            const obj = {};
            landings.forEach(item => {
                if (item && item.id) obj[item.id] = item;
            });
            toWrite = obj;
        }

        // Si accidentalmente se pasó algo que no es objeto, reemplazar por default
        if (!toWrite || typeof toWrite !== 'object') {
            toWrite = { default: { id: 'default', name: 'Default Landing', pixelId: FACEBOOK_PIXEL_ID, accessToken: FACEBOOK_ACCESS_TOKEN, active: true } };
        }

        await fs.writeFile(LANDINGS_FILE, JSON.stringify(toWrite, null, 2));
        console.log(`✅ Landings guardadas en ${LANDINGS_FILE} (size: ${JSON.stringify(toWrite).length} bytes)`);
        return true;
    } catch (error) {
        console.error('Error escribiendo landings:', error);
        return false;
    }
}

// ============================================
// FUNCIONES PARA NÚMEROS DE WHATSAPP ROTATIVOS
// ============================================

async function readWhatsAppRotation() {
    try {
        const data = await fs.readFile(WHATSAPP_ROTATION_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo rotación de WhatsApp:', error);
        return {};
    }
}

async function writeWhatsAppRotation(rotationData) {
    try {
        await fs.writeFile(WHATSAPP_ROTATION_FILE, JSON.stringify(rotationData, null, 2));
        return true;
    } catch (error) {
        console.error('Error escribiendo rotación de WhatsApp:', error);
        return false;
    }
}

// Obtener el siguiente número de WhatsApp en rotación round-robin
async function getNextWhatsAppNumber(landingId) {
    const landings = await readLandings();
    const landing = landings[landingId];

    if (!landing) {
        return null;
    }

    // Si no hay números configurados, usar el número por defecto
    if (!landing.whatsappNumbers || landing.whatsappNumbers.length === 0) {
        return landing.defaultWhatsAppNumber || null;
    }

    // Si solo hay un número, devolver ese
    if (landing.whatsappNumbers.length === 1) {
        return landing.whatsappNumbers[0].number;
    }

    // Obtener índice actual de rotación
    const rotation = await readWhatsAppRotation();
    const currentIndex = rotation[landingId] || 0;

    // Obtener el número actual
    const currentNumber = landing.whatsappNumbers[currentIndex];

    // Calcular siguiente índice (round-robin)
    const nextIndex = (currentIndex + 1) % landing.whatsappNumbers.length;

    // Guardar siguiente índice
    rotation[landingId] = nextIndex;
    await writeWhatsAppRotation(rotation);

    return currentNumber.number;
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

// Función para calcular comparación temporal (mes actual vs mes anterior)
function calculateTemporalComparison(events) {
    const now = new Date();

    // Calcular inicio del mes actual
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calcular inicio y fin del mes anterior
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Filtrar eventos del mes actual
    const currentMonthEvents = events.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= startOfCurrentMonth;
    });

    // Filtrar eventos del mes anterior
    const lastMonthEvents = events.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= startOfLastMonth && eventDate <= endOfLastMonth;
    });

    // Calcular stats de ambos períodos
    const currentStats = calculateStats(currentMonthEvents);
    const lastStats = calculateStats(lastMonthEvents);

    // Calcular porcentaje de cambio
    function calculateChange(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return (((current - previous) / previous) * 100).toFixed(1);
    }

    return {
        current: currentStats,
        previous: lastStats,
        changes: {
            clicks: calculateChange(currentStats.total_clicks, lastStats.total_clicks),
            messages: calculateChange(currentStats.total_messages, lastStats.total_messages),
            purchases: calculateChange(currentStats.total_purchases, lastStats.total_purchases),
            conversion: calculateChange(
                parseFloat(currentStats.conversion_click_to_purchase),
                parseFloat(lastStats.conversion_click_to_purchase)
            )
        }
    };
}

async function calculateCampaignStats(events) {
    // Obtener gastos de campaña desde Supabase
    const campaignSpend = await getAllCampaignSpend();
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
                closeRate: 0, // Tasa de cierre (Compras/Mensajes)
                aov: 0,      // Average Order Value
                avgTimeToConversion: 0, // Tiempo promedio hasta conversión (en horas)
                uniqueUsers: new Set(), // Para calcular usuarios únicos
                repeatCustomers: 0, // Clientes que compraron más de una vez
                retentionRate: 0, // Tasa de retención
                purchaseFrequency: 0, // Frecuencia de compra
                conversionTimes: [], // Array de tiempos de conversión
                dailyData: {} // Datos diarios para gráficos
            };
        }

        const group = campaignGroups[campaign];
        group.clicks++;

        // Rastrear usuario único (usando client_ip como identificador)
        if (event.client_ip) {
            group.uniqueUsers.add(event.client_ip);
        }

        if (event.has_message) group.messages++;

        if (event.has_purchase) {
            group.purchases++;
            group.revenue += parseFloat(event.purchase_value) || 0;

            // Calcular tiempo hasta conversión
            if (event.created_at && event.purchase_time) {
                const createdTime = new Date(event.created_at);
                const purchaseTime = new Date(event.purchase_time);
                const hoursToConversion = (purchaseTime - createdTime) / (1000 * 60 * 60);
                group.conversionTimes.push(hoursToConversion);
            }
        }

        // Agrupar datos por día para gráficos (usando fecha local)
        if (event.created_at) {
            const dateKey = getLocalDateKey(event.created_at);
            if (!group.dailyData[dateKey]) {
                group.dailyData[dateKey] = {
                    clicks: 0,
                    messages: 0,
                    purchases: 0,
                    revenue: 0
                };
            }
            group.dailyData[dateKey].clicks++;
            if (event.has_message) group.dailyData[dateKey].messages++;
            if (event.has_purchase) {
                group.dailyData[dateKey].purchases++;
                group.dailyData[dateKey].revenue += parseFloat(event.purchase_value) || 0;
            }
        }
    });

    // Calcular métricas derivadas
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

        // AOV (Average Order Value)
        if (data.purchases > 0) {
            data.aov = (data.revenue / data.purchases).toFixed(2);
        } else {
            data.aov = '0.00';
        }

        // Tiempo promedio hasta conversión
        if (data.conversionTimes.length > 0) {
            const avgTime = data.conversionTimes.reduce((a, b) => a + b, 0) / data.conversionTimes.length;
            data.avgTimeToConversion = avgTime.toFixed(1);
        } else {
            data.avgTimeToConversion = '0.0';
        }

        // Frecuencia de compra (compras por usuario único)
        const uniqueUserCount = data.uniqueUsers.size;
        if (uniqueUserCount > 0) {
            data.purchaseFrequency = (data.purchases / uniqueUserCount).toFixed(2);

            // Si la frecuencia > 1, hay clientes recurrentes
            if (data.purchases > uniqueUserCount) {
                data.repeatCustomers = data.purchases - uniqueUserCount;
                data.retentionRate = ((data.repeatCustomers / uniqueUserCount) * 100).toFixed(1);
            } else {
                data.repeatCustomers = 0;
                data.retentionRate = '0.0';
            }
        } else {
            data.purchaseFrequency = '0.00';
            data.retentionRate = '0.0';
        }

        // Convertir Set a número para el JSON
        data.uniqueUsers = uniqueUserCount;

        // Limpiar array de tiempos (no necesario en el resultado final)
        delete data.conversionTimes;
    });

    return campaignGroups;
}

// ============================================
// AUTENTICACIÓN
// ============================================

async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo usuarios:', error);
        return [];
    }
}

// Middleware de autenticación
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// ============================================
// RUTAS - AUTENTICACIÓN
// ============================================

// Página de login
app.get('/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.render('login');
});

// Procesar login
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        }

        const users = await readUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Crear sesión
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({ success: true, redirect: '/' });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.redirect('/login');
    });
});

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
  try {
    const {
      event_id,
      event_type,
      timestamp,
      user_agent,
      referrer,
      attribution,
      fbclid,
      utm_campaign,
      landing_id = 'default',
      purchase_value,
      purchase_currency
    } = req.body;

    // Construir objeto de atribución
    const finalAttribution = {
      ...attribution,
      fbclid: fbclid || attribution?.fbclid,
      utm_campaign: utm_campaign || attribution?.utm_campaign
    };

    const base = {
      event_id,
      event_type,
      created_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      user_agent,
      referrer,
      client_ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      attribution: finalAttribution,
      landing_id
    };

    // banderas según tipo
    if (event_type === 'whatsapp_click') {
      base.whatsapp_clicked = true;
      base.whatsapp_click_time = new Date().toISOString();
    }
    if (event_type === 'message') {
      base.has_message = true;
      base.message_time = new Date().toISOString();
    }
    if (event_type === 'purchase') {
      base.has_purchase = true;
      base.purchase_time = new Date().toISOString();
      base.purchase_value = Number(purchase_value || 0);
      base.purchase_currency = purchase_currency || 'ARS';
    }

    const saved = await upsertEventByEventId(base);
    return res.json({ ok: true, saved });
  } catch (e) {
    console.error('❌ track error', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Obtener todos los eventos (con paginación)
app.get('/api/events', async (req, res) => {
    const events = await readEvents();
    const stats = calculateStats(events);

    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // 50 eventos por defecto
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Ordenar por fecha (más recientes primero) y paginar
    const sortedEvents = events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex);

    res.json({
        events: paginatedEvents,
        stats,
        pagination: {
            total: events.length,
            page,
            limit,
            totalPages: Math.ceil(events.length / limit),
            hasMore: endIndex < events.length
        }
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

// Obtener datos temporales para gráficos (evolución diaria)
app.get('/api/campaigns/timeline', async (req, res) => {
    const { campaignName, days } = req.query;
    const events = await readEvents();
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);

    // Filtrar por campaña si se especifica
    let filteredEvents = clickedEvents;
    if (campaignName && campaignName !== 'all') {
        filteredEvents = clickedEvents.filter(e =>
            (e.attribution?.utm_campaign || 'Sin campaña') === campaignName
        );
    }

    // Filtrar por rango de días si se especifica
    if (days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        filteredEvents = filteredEvents.filter(e =>
            new Date(e.created_at) >= cutoffDate
        );
    }

    // Agrupar por día
    const dailyStats = {};
    const campaignSpend = await readCampaignSpend();

    filteredEvents.forEach(event => {
        if (!event.created_at) return;

        const dateKey = getLocalDateKey(event.created_at);
        const campaign = event.attribution?.utm_campaign || 'Sin campaña';

        if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = {
                date: dateKey,
                clicks: 0,
                messages: 0,
                purchases: 0,
                revenue: 0,
                spend: 0
            };
        }

        dailyStats[dateKey].clicks++;
        if (event.has_message) dailyStats[dateKey].messages++;
        if (event.has_purchase) {
            dailyStats[dateKey].purchases++;
            dailyStats[dateKey].revenue += parseFloat(event.purchase_value) || 0;
        }
    });

    // Calcular ROAS por día (nota: el gasto es total por campaña, no por día)
    // Para simplificar, distribuiremos el gasto proporcionalmente
    const totalDays = Object.keys(dailyStats).length;
    Object.keys(dailyStats).forEach(date => {
        const data = dailyStats[date];

        // Si es una campaña específica, distribuir su gasto
        if (campaignName && campaignName !== 'all' && campaignSpend[campaignName]) {
            data.spend = (campaignSpend[campaignName] / totalDays);
        }

        // Calcular ROAS
        if (data.spend > 0) {
            data.roas = (data.revenue / data.spend).toFixed(2);
        } else {
            data.roas = data.revenue > 0 ? '∞' : '0.00';
        }
    });

    // Convertir a array y ordenar por fecha
    const timelineData = Object.values(dailyStats).sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    res.json({
        timeline: timelineData
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

// Análisis de embudo (Funnel)
app.get('/api/funnel', async (req, res) => {
    const events = await readEvents();
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);
    const funnelAnalysis = calculateFunnelAnalysis(clickedEvents);

    res.json({
        success: true,
        funnel: funnelAnalysis
    });
});

// Recomendaciones automáticas
app.get('/api/recommendations', async (req, res) => {
    const events = await readEvents();
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);
    const campaignStats = await calculateCampaignStats(clickedEvents);
    const recommendations = await generateRecommendations(campaignStats);

    res.json({
        success: true,
        recommendations
    });
});

// Simulador de escala
app.post('/api/scale-simulator', async (req, res) => {
    const { campaignName, multiplier } = req.body;

    if (!campaignName || !multiplier) {
        return res.status(400).json({
            success: false,
            error: 'campaignName y multiplier son requeridos'
        });
    }

    const events = await readEvents();
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);
    const campaignStats = await calculateCampaignStats(clickedEvents);
    const campaign = campaignStats[campaignName];

    if (!campaign) {
        return res.status(404).json({
            success: false,
            error: 'Campaña no encontrada'
        });
    }

    const simulation = calculateScaleSimulation(campaign, parseFloat(multiplier));

    res.json({
        success: true,
        simulation
    });
});

// Alertas de presupuesto
app.get('/api/budget-alerts', async (req, res) => {
    const events = await readEvents();
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);
    const campaignStats = await calculateCampaignStats(clickedEvents);
    const alerts = await checkBudgetAlerts(campaignStats);

    res.json({
        success: true,
        alerts
    });
});

// Benchmarks por campaña
app.get('/api/benchmarks/:campaignName', async (req, res) => {
    const { campaignName } = req.params;

    const events = await readEvents();
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);
    const campaignStats = await calculateCampaignStats(clickedEvents);
    const campaign = campaignStats[campaignName];

    if (!campaign) {
        return res.status(404).json({
            success: false,
            error: 'Campaña no encontrada'
        });
    }

    const benchmarks = calculateBenchmarks(campaign);

    res.json({
        success: true,
        campaign: campaignName,
        benchmarks
    });
});

// API del dólar argentino
app.get('/api/dolar', async (req, res) => {
    const dolarData = await getDolarPrices();
    res.json(dolarData);
});

// Análisis financiero completo
app.get('/api/financial-analysis', async (req, res) => {
    const events = await readEvents();
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);

    // Obtener precio del dólar blue
    const dolarData = await getDolarPrices();
    const dolarBlue = dolarData.success ? dolarData.dolares.blue.venta : 1000;

    const financialAnalysis = await calculateFinancialAnalysis(clickedEvents, dolarBlue);
    const projections = calculateProjections(financialAnalysis, 3);

    res.json({
        success: true,
        financial: financialAnalysis,
        projections,
        dolar: dolarData
    });
});

// Cambiar landing actual en sesión
app.post('/api/switch-landing', async (req, res) => {
    const { landingId } = req.body;

    if (!landingId) {
        return res.status(400).json({
            success: false,
            error: 'landingId es requerido'
        });
    }

    // Verificar que el landing existe
    const landings = await readLandings();
    if (!landings[landingId]) {
        return res.status(404).json({
            success: false,
            error: 'Landing no encontrado'
        });
    }

    // Guardar en sesión
    req.session.landingId = landingId;

    res.json({
        success: true,
        landingId: landingId,
        landingName: landings[landingId].name
    });
});

// Obtener todas las landings
app.get('/api/landings', async (req, res) => {
    try {
        const landings = await getLandingSettings();
        res.json({
            success: true,
            landings: Object.values(landings)
        });
    } catch (error) {
        console.error('Error obteniendo landings:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las landings'
        });
    }
});

// PANEL: Notas y Tareas (persistencia en Supabase)
app.get('/api/panel/notes', async (req, res) => {
    try {
        const { landingId } = getCurrentLandingConfig(req);
        const rec = await getPanelNotes(landingId);
        res.json({ success: true, notes: rec?.notes || '' });
    } catch (err) {
        console.error('❌ Error fetching panel notes', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/panel/notes', async (req, res) => {
    try {
        const { landingId } = getCurrentLandingConfig(req);
        const { notes } = req.body;
        await upsertPanelNotes(landingId, notes || '');
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error saving panel notes', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/panel/tasks', async (req, res) => {
    try {
        const { landingId } = getCurrentLandingConfig(req);
        const rec = await getPanelTasks(landingId);
        res.json({ success: true, tasks: rec?.tasks || [] });
    } catch (err) {
        console.error('❌ Error fetching panel tasks', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/panel/tasks', async (req, res) => {
    try {
        const { landingId } = getCurrentLandingConfig(req);
        const { tasks } = req.body;
        await upsertPanelTasks(landingId, tasks || []);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error saving panel tasks', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Crear nueva landing
app.post('/api/landings', async (req, res) => {
    try {
        const { name, pixelId, accessToken } = req.body;

        // Validación
        if (!name || !pixelId || !accessToken) {
            return res.status(400).json({
                success: false,
                error: 'Nombre, Pixel ID y Access Token son requeridos'
            });
        }

        // Generar ID único (slug del nombre)
        const id = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');

        // Verificar que no existe
        const existingLanding = await getLandingSettings(id);
        if (existingLanding) {
            return res.status(400).json({
                success: false,
                error: 'Ya existe una landing con ese nombre'
            });
        }

        // Crear nueva landing en Supabase
        const savedLanding = await upsertLandingSettings(
            id,
            pixelId,
            accessToken,
            name,
            true, // active por defecto
            '', // defaultWhatsAppNumber vacío
            [] // whatsappNumbers vacío
        );

        res.json({
            success: true,
            landing: {
                id: savedLanding.landing_id,
                name: savedLanding.name,
                pixelId: savedLanding.pixel_id,
                accessToken: savedLanding.access_token,
                active: savedLanding.active,
                defaultWhatsAppNumber: savedLanding.default_whatsapp_number || '',
                whatsappNumbers: savedLanding.whatsapp_numbers || [],
                createdAt: savedLanding.created_at
            }
        });
    } catch (error) {
        console.error('Error creando landing:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear la landing'
        });
    }
});

// Actualizar landing existente
app.put('/api/landings/:id', async (req, res) => {
    const { id } = req.params;
    const { name, pixelId, accessToken, active } = req.body;

    try {
        // Obtener landing existente
        const landing = await getLandingSettings(id);
        
        if (!landing) {
            return res.status(404).json({
                success: false,
                error: 'Landing no encontrado'
            });
        }

        // No permitir editar la landing default desde esta interfaz
        if (id === 'default') {
            return res.status(403).json({
                success: false,
                error: 'No se puede modificar la landing principal desde esta interfaz'
            });
        }

        // Actualizar solo los campos proporcionados
        const updatedLanding = await upsertLandingSettings(
            id,
            pixelId || landing.pixelId,
            accessToken || landing.accessToken,
            name || landing.name,
            typeof active !== 'undefined' ? active : landing.active,
            landing.defaultWhatsAppNumber || '',
            landing.whatsappNumbers || []
        );

        res.json({
            success: true,
            landing: {
                id: updatedLanding.landing_id,
                name: updatedLanding.name,
                pixelId: updatedLanding.pixel_id,
                accessToken: updatedLanding.access_token,
                active: updatedLanding.active,
                defaultWhatsAppNumber: updatedLanding.default_whatsapp_number || '',
                whatsappNumbers: updatedLanding.whatsapp_numbers || []
            }
        });
    } catch (error) {
        console.error('Error actualizando landing:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar la landing'
        });
    }
});

// Eliminar landing
app.delete('/api/landings/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // No permitir eliminar la landing default
        if (id === 'default') {
            return res.status(403).json({
                success: false,
                error: 'No se puede eliminar la landing principal'
            });
        }

        // Verificar que existe
        const landing = await getLandingSettings(id);
        if (!landing) {
            return res.status(404).json({
                success: false,
                error: 'Landing no encontrado'
            });
        }

        // Eliminar de Supabase
        await deleteLandingSettings(id);

        res.json({
            success: true,
            message: 'Landing eliminado correctamente'
        });
    } catch (error) {
        console.error('Error eliminando landing:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al eliminar la landing'
        });
    }
});

// ============================================
// ENDPOINTS - NÚMEROS DE WHATSAPP
// ============================================

// Obtener números de WhatsApp de la landing actual
app.get('/api/whatsapp-numbers', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    const landings = await readLandings();
    const landing = landings[landingId];

    if (!landing) {
        return res.status(404).json({
            success: false,
            error: 'Landing no encontrado'
        });
    }

    res.json({
        success: true,
        numbers: landing.whatsappNumbers || []
    });
});

// Agregar número de WhatsApp
app.post('/api/whatsapp-numbers', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    const { number, label } = req.body;

    // Validación
    if (!number) {
        return res.status(400).json({
            success: false,
            error: 'El número es requerido'
        });
    }

    const landings = await readLandings();
    const landing = landings[landingId];

    if (!landing) {
        return res.status(404).json({
            success: false,
            error: 'Landing no encontrado'
        });
    }

    // Inicializar array si no existe
    if (!landing.whatsappNumbers) {
        landing.whatsappNumbers = [];
    }

    // Validar límite de 10 números
    if (landing.whatsappNumbers.length >= 10) {
        return res.status(400).json({
            success: false,
            error: 'Has alcanzado el límite de 10 números de WhatsApp'
        });
    }

    // Generar ID único
    const id = Date.now().toString();

    // Agregar número
    const newNumber = {
        id,
        number: number.trim(),
        label: label ? label.trim() : `Número ${landing.whatsappNumbers.length + 1}`,
        createdAt: new Date().toISOString()
    };

    landing.whatsappNumbers.push(newNumber);

    const saved = await writeLandings(landings);

    if (saved) {
        res.json({
            success: true,
            number: newNumber
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'Error al guardar el número'
        });
    }
});

// Actualizar número de WhatsApp
app.put('/api/whatsapp-numbers/:id', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    const { id } = req.params;
    const { number, label } = req.body;

    const landings = await readLandings();
    const landing = landings[landingId];

    if (!landing || !landing.whatsappNumbers) {
        return res.status(404).json({
            success: false,
            error: 'Landing no encontrado'
        });
    }

    const numberIndex = landing.whatsappNumbers.findIndex(n => n.id === id);

    if (numberIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'Número no encontrado'
        });
    }

    // Actualizar campos
    if (number) landing.whatsappNumbers[numberIndex].number = number.trim();
    if (label) landing.whatsappNumbers[numberIndex].label = label.trim();

    const saved = await writeLandings(landings);

    if (saved) {
        res.json({
            success: true,
            number: landing.whatsappNumbers[numberIndex]
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el número'
        });
    }
});

// Eliminar número de WhatsApp
app.delete('/api/whatsapp-numbers/:id', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    const { id } = req.params;

    const landings = await readLandings();
    const landing = landings[landingId];

    if (!landing || !landing.whatsappNumbers) {
        return res.status(404).json({
            success: false,
            error: 'Landing no encontrado'
        });
    }

    const numberIndex = landing.whatsappNumbers.findIndex(n => n.id === id);

    if (numberIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'Número no encontrado'
        });
    }

    landing.whatsappNumbers.splice(numberIndex, 1);

    const saved = await writeLandings(landings);

    if (saved) {
        res.json({
            success: true,
            message: 'Número eliminado correctamente'
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el número'
        });
    }
});

// Actualizar número de WhatsApp por defecto
app.put('/api/default-whatsapp', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    const { number } = req.body;

    // Validación
    if (!number) {
        return res.status(400).json({
            success: false,
            error: 'El número es requerido'
        });
    }

    const landings = await readLandings();
    const landing = landings[landingId];

    if (!landing) {
        return res.status(404).json({
            success: false,
            error: 'Landing no encontrado'
        });
    }

    // Actualizar número por defecto
    landing.defaultWhatsAppNumber = number.trim();

    const saved = await writeLandings(landings);

    if (saved) {
        res.json({
            success: true,
            number: landing.defaultWhatsAppNumber,
            message: 'Número principal actualizado correctamente'
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el número principal'
        });
    }
});

// Obtener siguiente número en rotación
app.get('/api/whatsapp-numbers/next', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    const nextNumber = await getNextWhatsAppNumber(landingId);

    if (!nextNumber) {
        return res.status(404).json({
            success: false,
            error: 'No hay números de WhatsApp configurados para esta landing'
        });
    }

    res.json({
        success: true,
        number: nextNumber
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
    try {
        const { eventId } = req.params;
        
        console.log('📝 Intentando marcar mensaje para event_id:', eventId);

        // Actualizar evento usando Supabase
        const updated = await updateEvent(eventId, {
            has_message: true,
            message_time: new Date().toISOString()
        });

        if (!updated) {
            console.log('❌ Evento no encontrado:', eventId);
            return res.status(404).json({ 
                success: false, 
                error: 'Evento no encontrado',
                details: 'Verifica que el ID sea exactamente igual al que aparece en la tabla'
            });
        }

        console.log('✅ Evento actualizado:', updated);

        // Opcional: Enviar a Facebook Conversion API
        const fbResult = await sendToFacebookConversionAPI(
            eventId,
            'Contact',
            {
                user_agent: updated.user_agent,
                client_ip: updated.client_ip,
                source_url: 'whatsapp'
            }
        );

        res.json({
            success: true,
            event: updated,
            facebook_api: fbResult
        });
    } catch (error) {
        console.error('❌ Error al marcar mensaje:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            tip: 'Asegúrate de que el ID del evento sea exactamente igual al que aparece en la tabla'
        });
    }
});

// Endpoint de depuración para ver evento por ID
app.get('/api/debug/event/:eventId', async (req, res) => {
    try {
        const event = await getEventByEventId(req.params.eventId);
        if (!event) {
            return res.status(404).json({ 
                success: false, 
                error: 'Evento no encontrado' 
            });
        }
        res.json({ success: true, event });
    } catch (error) {
        console.error('Error obteniendo evento:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Marcar evento como "compra realizada"
app.post('/api/events/:eventId/purchase', async (req, res) => {
    try {
        const { eventId } = req.params;
        let { value, currency } = req.body;

        console.log('💰 Intentando registrar compra:', { eventId, value, currency });

        // VALIDACIÓN: Valor es obligatorio
        if (!value || isNaN(value) || parseFloat(value) <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'El valor de la compra es obligatorio y debe ser mayor a 0' 
            });
        }

        value = parseFloat(value);
        currency = currency || 'ARS';

        // Actualizar evento usando Supabase
        const updated = await updateEvent(eventId, {
            has_purchase: true,
            purchase_time: new Date().toISOString(),
            purchase_value: value,
            purchase_currency: currency
        });

        if (!updated) {
            console.log('❌ Evento no encontrado:', eventId);
            return res.status(404).json({ 
                success: false, 
                error: 'Evento no encontrado',
                details: 'Verifica que el ID sea exactamente igual al que aparece en la tabla'
            });
        }

        console.log('✅ Compra registrada:', updated);

        // Enviar a Facebook Conversion API
        const fbResult = await sendToFacebookConversionAPI(
            eventId,
            'Purchase',
            {
                user_agent: updated.user_agent,
                client_ip: updated.client_ip,
                source_url: 'whatsapp',
                custom_data: {
                    value: value,
                    currency: currency,
                    content_name: 'Primer Depósito Casino',
                    content_type: 'product',
                    num_items: 1
                }
            }
        );

        res.json({
            success: true,
            event: updated,
            facebook_api: fbResult
        });
    } catch (error) {
        console.error('❌ Error al registrar compra:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            tip: 'Asegúrate de que el ID del evento sea exactamente igual al que aparece en la tabla'
        });
    }

    res.json({
        success: true,
        event,
        facebook_api: fbResult
    });
});

// ============================================
// ANÁLISIS DE EMBUDO (FUNNEL)
// ============================================

function calculateFunnelAnalysis(events) {
    const total_clicks = events.length;
    const total_messages = events.filter(e => e.has_message).length;
    const total_purchases = events.filter(e => e.has_purchase).length;

    return {
        steps: [
            {
                name: 'Clicks en WhatsApp',
                count: total_clicks,
                percentage: 100,
                drop_rate: 0
            },
            {
                name: 'Mensajes enviados',
                count: total_messages,
                percentage: total_clicks > 0 ? ((total_messages / total_clicks) * 100).toFixed(1) : 0,
                drop_rate: total_clicks > 0 ? (((total_clicks - total_messages) / total_clicks) * 100).toFixed(1) : 0
            },
            {
                name: 'Compras realizadas',
                count: total_purchases,
                percentage: total_clicks > 0 ? ((total_purchases / total_clicks) * 100).toFixed(1) : 0,
                drop_rate: total_messages > 0 ? (((total_messages - total_purchases) / total_messages) * 100).toFixed(1) : 0
            }
        ],
        summary: {
            total_clicks,
            total_messages,
            total_purchases,
            click_to_message_rate: total_clicks > 0 ? ((total_messages / total_clicks) * 100).toFixed(1) : 0,
            message_to_purchase_rate: total_messages > 0 ? ((total_purchases / total_messages) * 100).toFixed(1) : 0,
            overall_conversion: total_clicks > 0 ? ((total_purchases / total_clicks) * 100).toFixed(1) : 0
        }
    };
}

// ============================================
// SISTEMA DE RECOMENDACIONES AUTOMÁTICAS
// ============================================

async function generateRecommendations(campaignStats) {
    const recommendations = [];

    Object.values(campaignStats).forEach(campaign => {
        const roas = parseFloat(campaign.roas);
        const spend = parseFloat(campaign.spend);
        const revenue = parseFloat(campaign.revenue);

        // Recomendación: ROAS alto - Escalar
        if (roas >= 4 && spend > 0) {
            recommendations.push({
                type: 'success',
                icon: '⚡',
                campaign: campaign.name,
                title: 'Oportunidad de escala',
                message: `Esta campaña tiene un ROAS de ${roas}, considera escalar el presupuesto +50%`,
                action: 'scale_up',
                priority: 'high'
            });
        }

        // Recomendación: ROAS bajo - Pausar
        if (roas < 1 && spend > 100 && campaign.clicks > 10) {
            recommendations.push({
                type: 'danger',
                icon: '⚠️',
                campaign: campaign.name,
                title: 'Campaña con bajo rendimiento',
                message: `ROAS de ${roas} está por debajo de 1. Considera pausar o optimizar`,
                action: 'pause',
                priority: 'high'
            });
        }

        // Recomendación: Buen CTR pero bajo cierre
        const closeRate = parseFloat(campaign.closeRate);
        if (campaign.messages > 5 && closeRate < 20) {
            recommendations.push({
                type: 'warning',
                icon: '💡',
                campaign: campaign.name,
                title: 'Mejorar tasa de cierre',
                message: `Tienes ${campaign.messages} mensajes pero solo ${closeRate}% cierra. Revisa tu proceso de venta`,
                action: 'optimize_sales',
                priority: 'medium'
            });
        }

        // Recomendación: Alto AOV
        const aov = parseFloat(campaign.aov);
        if (aov > 0 && campaign.purchases > 3) {
            const avgAov = revenue / campaign.purchases;
            if (avgAov > 500) {
                recommendations.push({
                    type: 'info',
                    icon: '💰',
                    campaign: campaign.name,
                    title: 'Valor promedio alto',
                    message: `AOV de $${aov} es excelente. Considera crear campañas lookalike`,
                    action: 'create_lookalike',
                    priority: 'low'
                });
            }
        }
    });

    // Ordenar por prioridad
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
}

// ============================================
// SIMULADOR DE ESCALA
// ============================================

function calculateScaleSimulation(campaign, multiplier) {
    const currentSpend = parseFloat(campaign.spend) || 0;
    const currentRevenue = parseFloat(campaign.revenue) || 0;
    const currentROAS = parseFloat(campaign.roas) || 0;

    // Simular con degradación de rendimiento (asumimos 10% de pérdida al escalar)
    const degradationFactor = 0.90;
    const projectedSpend = currentSpend * multiplier;
    const projectedRevenue = (currentRevenue * multiplier) * degradationFactor;
    const projectedROAS = projectedSpend > 0 ? projectedRevenue / projectedSpend : 0;
    const projectedMargin = projectedRevenue - projectedSpend;

    return {
        current: {
            spend: currentSpend,
            revenue: currentRevenue,
            roas: currentROAS,
            margin: currentRevenue - currentSpend
        },
        projected: {
            spend: projectedSpend,
            revenue: projectedRevenue,
            roas: projectedROAS.toFixed(2),
            margin: projectedMargin,
            additional_revenue: projectedRevenue - currentRevenue,
            additional_margin: projectedMargin - (currentRevenue - currentSpend)
        },
        multiplier: multiplier,
        degradation_applied: 10 // porcentaje
    };
}

// ============================================
// GESTIÓN DE PRESUPUESTO Y ALERTAS
// ============================================

async function checkBudgetAlerts(campaignStats) {
    const alerts = [];

    Object.values(campaignStats).forEach(campaign => {
        const spend = parseFloat(campaign.spend) || 0;

        // Aquí podrías tener presupuestos mensuales guardados
        // Por ahora, asumimos un presupuesto ejemplo de $1000 por campaña
        const monthlyBudget = 1000;
        const spendPercentage = (spend / monthlyBudget) * 100;

        if (spendPercentage >= 100) {
            alerts.push({
                type: 'danger',
                campaign: campaign.name,
                message: `⛔ Presupuesto excedido: ${spendPercentage.toFixed(0)}%`,
                percentage: 100
            });
        } else if (spendPercentage >= 90) {
            alerts.push({
                type: 'warning',
                campaign: campaign.name,
                message: `🔴 Presupuesto al ${spendPercentage.toFixed(0)}% - Límite próximo`,
                percentage: spendPercentage.toFixed(0)
            });
        } else if (spendPercentage >= 80) {
            alerts.push({
                type: 'info',
                campaign: campaign.name,
                message: `🟡 Presupuesto al ${spendPercentage.toFixed(0)}%`,
                percentage: spendPercentage.toFixed(0)
            });
        }
    });

    return alerts;
}

// ============================================
// API DEL DÓLAR ARGENTINO
// ============================================

async function getDolarPrices() {
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares');
        const data = await response.json();

        // Extraer los principales tipos de dólar
        const dolares = {
            oficial: data.find(d => d.casa === 'oficial') || { compra: 0, venta: 0 },
            blue: data.find(d => d.casa === 'blue') || { compra: 0, venta: 0 },
            tarjeta: data.find(d => d.casa === 'tarjeta') || { compra: 0, venta: 0 },
            mep: data.find(d => d.casa === 'bolsa') || { compra: 0, venta: 0 },
            cripto: data.find(d => d.casa === 'cripto') || { compra: 0, venta: 0 }
        };

        return {
            success: true,
            dolares,
            lastUpdate: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error al obtener precio del dólar:', error);
        return {
            success: false,
            dolares: {
                oficial: { compra: 0, venta: 0 },
                blue: { compra: 0, venta: 0 },
                tarjeta: { compra: 0, venta: 0 },
                mep: { compra: 0, venta: 0 },
                cripto: { compra: 0, venta: 0 }
            },
            error: error.message
        };
    }
}

// ============================================
// ANÁLISIS FINANCIERO AVANZADO
// ============================================

// Helper function: Convertir timestamp a fecha local (YYYY-MM-DD)
function getLocalDateKey(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function calculateFinancialAnalysis(filteredEvents, allEvents, dolarBlue, dateFrom, dateTo) {
    const campaignSpend = await readCampaignSpend();

    // Obtener todos los eventos con compra (de los eventos FILTRADOS)
    const purchases = filteredEvents.filter(e => e.has_purchase && e.purchase_value);

    // Calcular totales en ARS
    const totalRevenue = purchases.reduce((sum, e) => sum + (parseFloat(e.purchase_value) || 0), 0);

    // Determinar rango de días para análisis
    let startDate, endDate, daysDiff;
    if (dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
        daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    } else {
        // Por defecto, últimos 30 días
        endDate = new Date();
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 29);
        daysDiff = 30;
    }

    // Calcular gasto SOLO de los eventos filtrados (basado en sus campañas)
    // Usar allEvents para calcular el total de eventos por campaña
    const totalSpend = filteredEvents.reduce((sum, e) => {
        const campaignId = e.attribution?.utm_campaign || 'manual_test';
        const eventSpend = parseFloat(campaignSpend[campaignId] || 0);
        // Contar todos los eventos de esa campaña (sin filtrar) para distribuir el gasto correctamente
        const totalEventsInCampaign = allEvents.filter(ev => (ev.attribution?.utm_campaign || 'manual_test') === campaignId).length;
        // Cada evento filtrado representa una fracción del gasto total de la campaña
        return sum + (eventSpend / totalEventsInCampaign);
    }, 0);

    console.log(`📅 Período filtrado: ${daysDiff} días (${dateFrom || 'sin filtro'} a ${dateTo || 'sin filtro'})`);
    console.log(`📊 Eventos filtrados: ${filteredEvents.length} de ${allEvents.length} totales`);
    console.log(`💰 Ingresos en período: $${totalRevenue.toFixed(2)}`);
    console.log(`💸 Gasto en período: $${totalSpend.toFixed(2)}`);

    const totalProfit = totalRevenue - totalSpend;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roi = totalSpend > 0 ? ((totalProfit / totalSpend) * 100) : 0;

    // Conversión a USD (solo usando Blue)
    const dolarRate = dolarBlue || 1000; // Default si no hay precio
    const totalRevenueUSD = totalRevenue / dolarRate;
    const totalSpendUSD = totalSpend / dolarRate;
    const totalProfitUSD = totalProfit / dolarRate;

    // Análisis por día (rango dinámico) usando fechas locales
    const dailyData = {};
    for (let i = 0; i < daysDiff; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = getLocalDateKey(date);
        dailyData[dateKey] = {
            revenue: 0,
            spend: 0,
            profit: 0,
            purchases: 0,
            clicks: 0
        };
    }

    // Llenar datos por día usando created_at (fecha de llegada del usuario)
    // Esto mantiene consistencia con el dashboard y el filtro
    purchases.forEach(event => {
        // SIEMPRE usar created_at para mantener consistencia
        const timestamp = event.created_at;
        const dateKey = getLocalDateKey(timestamp);

        // Si la fecha no está en el rango inicializado, crear entrada
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                revenue: 0,
                spend: 0,
                profit: 0,
                purchases: 0,
                clicks: 0
            };
        }

        dailyData[dateKey].revenue += parseFloat(event.purchase_value) || 0;
        dailyData[dateKey].purchases += 1;
    });

    // Llenar clicks por día (usando eventos FILTRADOS)
    filteredEvents.forEach(event => {
        const dateKey = getLocalDateKey(event.created_at);

        // Si la fecha no está en el rango inicializado, crear entrada
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                revenue: 0,
                spend: 0,
                profit: 0,
                purchases: 0,
                clicks: 0
            };
        }

        dailyData[dateKey].clicks += 1;
    });

    // Distribuir gasto proporcionalmente por día y calcular profit
    const daysWithData = Object.keys(dailyData).length;
    const dailySpend = daysWithData > 0 ? totalSpend / daysWithData : 0;

    Object.keys(dailyData).forEach(dateKey => {
        dailyData[dateKey].spend = dailySpend;
        dailyData[dateKey].profit = dailyData[dateKey].revenue - dailyData[dateKey].spend;
    });

    // Análisis de flujo de caja
    const cashFlow = {
        ingresos: totalRevenue,
        egresos: totalSpend,
        flujoNeto: totalProfit,
        proyeccionMensual: totalProfit * (30 / daysDiff)
    };

    // Punto de equilibrio
    const avgPurchaseValue = purchases.length > 0 ? totalRevenue / purchases.length : 0;
    const avgCostPerPurchase = purchases.length > 0 ? totalSpend / purchases.length : 0;
    const breakEvenPurchases = avgPurchaseValue > avgCostPerPurchase
        ? Math.ceil(totalSpend / (avgPurchaseValue - avgCostPerPurchase))
        : 0;

    // Métricas de rentabilidad
    const rentability = {
        roasGlobal: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        roiPercentage: roi,
        profitMargin: profitMargin,
        avgTicket: avgPurchaseValue,
        costPerSale: avgCostPerPurchase,
        breakEvenPoint: breakEvenPurchases,
        dailyAvgProfit: totalProfit / daysDiff
    };

    // Análisis por campaña (usando eventos FILTRADOS)
    const campaignFinancials = {};
    const campaignStats = await calculateCampaignStats(filteredEvents);

    Object.keys(campaignStats).forEach(campaignName => {
        const campaign = campaignStats[campaignName];
        campaignFinancials[campaignName] = {
            revenue: campaign.revenue,
            spend: campaign.spend,
            profit: campaign.margin,
            roi: campaign.spend > 0 ? ((campaign.margin / campaign.spend) * 100) : 0,
            roas: campaign.roas,
            profitMargin: campaign.revenue > 0 ? ((campaign.margin / campaign.revenue) * 100) : 0,
            // Conversión a USD
            revenueUSD: campaign.revenue / dolarRate,
            spendUSD: campaign.spend / dolarRate,
            profitUSD: campaign.margin / dolarRate
        };
    });

    return {
        summary: {
            totalRevenue,
            totalSpend,
            totalProfit,
            profitMargin,
            roi,
            totalRevenueUSD,
            totalSpendUSD,
            totalProfitUSD,
            totalPurchases: purchases.length,
            totalClicks: filteredEvents.length
        },
        cashFlow,
        rentability,
        dailyData: dailyData,
        campaignFinancials,
        dolarRate
    };
}

// ============================================
// PROYECCIONES FINANCIERAS
// ============================================

function calculateProjections(financialData, months = 3) {
    const { summary, rentability } = financialData;

    const projections = [];
    const monthlyGrowthRate = 0.10; // 10% de crecimiento mensual estimado

    for (let i = 1; i <= months; i++) {
        const growthFactor = Math.pow(1 + monthlyGrowthRate, i);

        projections.push({
            month: i,
            projectedRevenue: summary.totalRevenue * growthFactor,
            projectedSpend: summary.totalSpend * growthFactor,
            projectedProfit: summary.totalProfit * growthFactor,
            projectedROI: rentability.roiPercentage,
            projectedRevenueUSD: summary.totalRevenueUSD * growthFactor,
            projectedProfitUSD: summary.totalProfitUSD * growthFactor,
            confidence: 100 - (i * 10) // Confianza decrece con el tiempo
        });
    }

    return projections;
}

// ============================================
// BENCHMARKS Y OBJETIVOS
// ============================================

function calculateBenchmarks(campaign) {
    const roas = parseFloat(campaign.roas) || 0;
    const closeRate = parseFloat(campaign.closeRate) || 0;
    const cpa = parseFloat(campaign.cpa) || 0;

    // Benchmarks de la industria (estos son ejemplos, ajustar según tu negocio)
    const benchmarks = {
        roas: {
            excellent: 5,
            good: 3,
            acceptable: 2,
            poor: 1
        },
        closeRate: {
            excellent: 40,
            good: 25,
            acceptable: 15,
            poor: 10
        },
        cpa: {
            excellent: 50,
            good: 100,
            acceptable: 200,
            poor: 300
        }
    };

    function getStatus(value, metric, inverse = false) {
        const bench = benchmarks[metric];
        if (inverse) {
            // Para CPA, menor es mejor
            if (value <= bench.excellent) return 'excellent';
            if (value <= bench.good) return 'good';
            if (value <= bench.acceptable) return 'acceptable';
            return 'poor';
        } else {
            // Para ROAS y Close Rate, mayor es mejor
            if (value >= bench.excellent) return 'excellent';
            if (value >= bench.good) return 'good';
            if (value >= bench.acceptable) return 'acceptable';
            return 'poor';
        }
    }

    return {
        roas: {
            value: roas,
            status: getStatus(roas, 'roas'),
            benchmark: benchmarks.roas
        },
        closeRate: {
            value: closeRate,
            status: getStatus(closeRate, 'closeRate'),
            benchmark: benchmarks.closeRate
        },
        cpa: {
            value: cpa,
            status: getStatus(cpa, 'cpa', true),
            benchmark: benchmarks.cpa
        }
    };
}

// ============================================
// RUTAS - PANEL WEB
// ============================================

// Dashboard SIN protección de login (login deshabilitado temporalmente)
// ============================================
// DASHBOARD (lee de Supabase y mantiene tu lógica)
// ============================================
app.get(['/', '/panel'], async (req, res) => {
  try {
    // tu función actual: mantiene la misma lógica
    const { landingId } = getCurrentLandingConfig(req);

    // Si querés soportar fechas por query: ?from=2025-10-01&to=2025-10-22
    const dateFrom = req.query.from || null;
    const dateTo   = req.query.to   || null;

    // 1) Traer TODOS los eventos de esa landing desde Supabase
    const events = await getEvents(landingId, dateFrom, dateTo);

    // 2) Filtrar por los que tienen click de WhatsApp (misma lógica que tenías)
    const clickedEvents = events.filter(e => {
      const eventLandingId = e.landing_id || 'default';
      return e.whatsapp_clicked === true && eventLandingId === landingId;
    });

    // 3) Calcular métricas con tus funciones existentes
    const stats = calculateStats(clickedEvents);
    const temporalComparison = calculateTemporalComparison(clickedEvents);

    // 4) Si tu calculateCampaignStats usa gasto por campaña, le pasamos el mapa desde Supabase
    //    (si tu función ya lo resuelve sola, podés dejarlo como lo tenías)
    let campaignStats;
    try {
      const spendMap = await getAllCampaignSpend(); // { campaign_id: spend, ... }
      campaignStats = await calculateCampaignStats(clickedEvents, spendMap);
    } catch {
      // Fallback por si no usás campaign_spend aún
      campaignStats = await calculateCampaignStats(clickedEvents);
    }

    // 5) Logs: si los leías de archivo, podés dejarlos vacíos por ahora
    const logs = []; // o await readLogs() si lo mantenés

    // 6) Render igual que antes
    res.render('dashboard', {
      events: clickedEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      stats,
      temporalComparison,
      campaignStats,
      logs: logs.slice(0, 50),
      currentLandingId: landingId
    });
  } catch (err) {
    console.error('❌ dashboard error', err);
    res.status(500).send('Error interno del servidor');
  }
});


// Página de Campañas y ROAS
app.get('/campaigns', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    // Obtener eventos de Supabase filtrados por landing y clicks
    const events = await getEvents(landingId);

    // Filtrar solo eventos con click en WhatsApp
    const clickedEvents = events.filter(e => e.whatsapp_clicked === true);

    const campaignStats = await calculateCampaignStats(clickedEvents);
    const funnelAnalysis = calculateFunnelAnalysis(clickedEvents);
    const recommendations = await generateRecommendations(campaignStats);
    const budgetAlerts = await checkBudgetAlerts(campaignStats);

    // Calcular benchmarks para cada campaña
    const campaignBenchmarks = {};
    Object.keys(campaignStats).forEach(campaignName => {
        campaignBenchmarks[campaignName] = calculateBenchmarks(campaignStats[campaignName]);
    });

    res.render('campaigns', {
        campaignStats,
        funnelAnalysis,
        recommendations,
        budgetAlerts,
        campaignBenchmarks,
        currentLandingId: landingId // ← Pasar landing actual al template
    });
});

// Página de Finanzas
app.get('/finanzas', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    const events = await readEvents();

    // Obtener parámetros de filtro de fecha
    const { dateFrom, dateTo } = req.query;

    console.log('📅 Filtros de fecha recibidos:', { dateFrom, dateTo });

    // Filtrar por landing_id y solo eventos con click en WhatsApp
    let clickedEvents = events.filter(e => {
        const eventLandingId = e.landing_id || 'default';
        return e.whatsapp_clicked === true && eventLandingId === landingId;
    });

    console.log(`📊 Eventos antes de filtrar por fecha: ${clickedEvents.length}`);

    // Aplicar filtro de fechas si existen
    // NOTA: Para compras, usar purchase_time; para clicks, usar created_at
    if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);

        console.log(`📅 Filtrando desde ${fromDate.toISOString()} hasta ${toDate.toISOString()}`);

        clickedEvents = clickedEvents.filter(e => {
            // SIEMPRE usar created_at (fecha de llegada del usuario)
            // Esto mantiene consistencia con el dashboard
            const eventDate = new Date(e.created_at);
            return eventDate >= fromDate && eventDate <= toDate;
        });

        console.log(`📊 Eventos después de filtrar por fecha: ${clickedEvents.length}`);
    } else {
        console.log('⚠️ No hay filtros de fecha, mostrando todos los eventos');
    }

    // Obtener precio del dólar
    const dolarData = await getDolarPrices();
    const dolarBlue = dolarData.success ? dolarData.dolares.blue.venta : 1000;

    // Calcular totales antes del filtro para comparación
    const allEventsForLanding = events.filter(e => {
        const eventLandingId = e.landing_id || 'default';
        return e.whatsapp_clicked === true && eventLandingId === landingId;
    });

    // Análisis financiero con filtros de fecha
    const financialAnalysis = await calculateFinancialAnalysis(clickedEvents, allEventsForLanding, dolarBlue, dateFrom, dateTo);
    const projections = calculateProjections(financialAnalysis, 6);

    res.render('finanzas', {
        financial: financialAnalysis,
        projections,
        dolar: dolarData,
        currentLandingId: landingId,
        dateFrom: dateFrom || '',
        dateTo: dateTo || '',
        filteredCount: clickedEvents.length,
        totalCount: allEventsForLanding.length,
        hasFilter: !!(dateFrom && dateTo)
    });
});

// Página de Configuración de Landings
app.get('/settings', async (req, res) => {
    const landings = await readLandings();
    res.render('settings', {
        landings: Object.values(landings)
    });
});

// Página de Números de WhatsApp
app.get('/numeros', async (req, res) => {
    const { landingId } = getCurrentLandingConfig(req);
    const landings = await readLandings();
    const landing = landings[landingId];

    res.render('numeros', {
        currentLandingId: landingId,
        currentLandingName: landing ? landing.name : 'Desconocido',
        defaultNumber: landing ? landing.defaultWhatsAppNumber : '',
        numbers: landing && landing.whatsappNumbers ? landing.whatsappNumbers : []
    });
});

// ============================================
// RUTA PRINCIPAL DEL PANEL
// ============================================

app.get('/', async (req, res) => {
    try {
        const events = await readEvents();
        const logs = await readLogs();
        const stats = calculateStats(events);
        const temporalComparison = calculateTemporalComparison(events);

        res.render('dashboard', {
            stats,
            events,
            logs,
            temporalComparison,
            currentLandingId: 'default'
        });
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        res.status(500).send('Error interno del servidor');
    }
});


// ============================================
// INICIAR SERVIDOR
// ============================================

async function startServer() {
  await initDataFile();

  if (!process.env.VERCEL) {
    // Solo iniciar el servidor localmente
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
}

// ✅ Ejecutar localmente
if (!process.env.VERCEL) {
  startServer();
}

// ✅ Exportar la app para Vercel (serverless)
export default app;
