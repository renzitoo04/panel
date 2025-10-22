// ============================================
// SISTEMA DE TRACKING SIMPLE Y LIMPIO
// ============================================

const TRACKING_CONFIG = {
    whatsappNumber: '5491171071767',
    backendUrl: 'http://localhost:3000',
    defaultMessage: '¡Hola! Vi la promoción. Código de seguimiento: '
};

// Generar UUID v4 simple
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let globalEventId = null;
let hasTrackedConversion = false;
let hasRedirected = false;

function generateEventId() {
    if (!globalEventId) {
        globalEventId = generateUUID();
        console.log('🆔 Event ID generado:', globalEventId);
    }
    return globalEventId;
}

// Registrar evento en el backend
async function registerEvent(eventId, eventType = 'pageview') {
    try {
        const response = await fetch(`${TRACKING_CONFIG.backendUrl}/api/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: eventId,
                event_type: eventType,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                referrer: document.referrer || 'direct'
            })
        });

        if (response.ok) {
            console.log(`✅ Evento ${eventType} registrado en el panel`);
        }
    } catch (error) {
        console.warn('⚠️ Error al conectar con el panel:', error);
    }
}

// Enviar evento a Facebook Pixel
function sendFacebookEvent(eventName, eventId) {
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, {}, { eventID: eventId });
        console.log(`✅ Evento ${eventName} enviado a Facebook Pixel`);
    }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    const eventId = generateEventId();

    // Registrar PageView
    registerEvent(eventId, 'pageview');
    sendFacebookEvent('PageView', eventId);

    console.log('📊 Sistema de tracking inicializado');

    // Configurar botón de WhatsApp
    setupWhatsAppButton();
});

// Configurar botón de WhatsApp
function setupWhatsAppButton() {
    const buttons = document.querySelectorAll('.wa-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', handleWhatsAppClick, false);
    });

    console.log(`✅ ${buttons.length} botón(es) de WhatsApp configurado(s)`);
}

// Manejador del click en WhatsApp
function handleWhatsAppClick(event) {
    event.preventDefault();
    event.stopPropagation();

    // Protección anti-spam
    if (hasRedirected) {
        console.log('⚠️ Click ignorado - cooldown activo');
        return;
    }

    hasRedirected = true;
    console.log('🖱️ Click en botón de WhatsApp');

    const eventId = generateEventId();

    // Crear URL de WhatsApp
    const message = TRACKING_CONFIG.defaultMessage + eventId;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${TRACKING_CONFIG.whatsappNumber}?text=${encodedMessage}`;

    // Trackear solo la primera vez
    if (!hasTrackedConversion) {
        hasTrackedConversion = true;
        sendFacebookEvent('ClickWhatsApp', eventId);
        registerEvent(eventId, 'whatsapp_click');
        console.log('📋 Event ID:', eventId);
    }

    // Abrir WhatsApp
    console.log('➡️ Abriendo WhatsApp...');
    window.open(whatsappUrl, '_blank');

    // Resetear cooldown después de 2 segundos
    setTimeout(() => {
        hasRedirected = false;
    }, 2000);
}

// Funciones auxiliares para imágenes
document.addEventListener('DOMContentLoaded', function() {
    // Fallback para imágenes
    document.querySelectorAll('img[data-fallback]').forEach(img => {
        img.addEventListener('error', () => {
            if (img.dataset.fallback && !img.dataset.tried) {
                img.dataset.tried = 'true';
                img.src = img.dataset.fallback;
            }
        });
    });

    // Ajustar altura de viewport
    function setAppVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--app-vh', `${vh}px`);
    }

    setAppVH();
    window.addEventListener('resize', setAppVH);
    window.addEventListener('orientationchange', () => {
        setTimeout(setAppVH, 180);
    });

    // Scroll al inicio
    window.scrollTo(0, 0);
});

console.log('✅ Sistema de tracking cargado correctamente');
