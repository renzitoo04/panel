// Configuración
const CONFIG = {
    // REEMPLAZAR con tu número de WhatsApp (incluye código de país, sin +)
    // Ejemplo: 5491123456789 para Argentina
    whatsappNumber: '5491171071767',

    // URL de tu backend/panel (cambiar cuando tengas el servidor corriendo)
    // Si usas localhost: 'http://localhost:3000'
    // Si usas un servidor: 'https://tudominio.com'
    backendUrl: 'http://localhost:3000',

    // Mensaje predeterminado de WhatsApp
    defaultMessage: '¡Hola! Vi la promoción. Código de seguimiento: '
};

// Generar event_id único al cargar la página
let eventId = null;

function generateUUID() {
    // Implementación simple de UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateEventId() {
    // Generar UUID v4
    eventId = generateUUID();
    console.log('Event ID generado:', eventId);

    // Registrar el evento "PageView" en el backend
    registerEvent(eventId, 'pageview');

    return eventId;
}

// Registrar evento en el backend
async function registerEvent(eventId, eventType = 'pageview') {
    try {
        const response = await fetch(`${CONFIG.backendUrl}/api/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_id: eventId,
                event_type: eventType,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                referrer: document.referrer || 'direct'
            })
        });

        if (!response.ok) {
            console.warn('No se pudo registrar el evento en el backend');
        }
    } catch (error) {
        console.warn('Error al conectar con el backend:', error);
        // No bloqueamos la funcionalidad si el backend no está disponible
    }
}

// Enviar evento a Facebook Pixel con event_id
function sendFacebookEvent(eventName, eventId) {
    if (typeof fbq !== 'undefined') {
        // Enviar evento con event_id para deduplicación
        fbq('track', eventName, {}, {
            eventID: eventId
        });
        console.log(`Evento ${eventName} enviado a Facebook Pixel con event_id:`, eventId);
    } else {
        console.warn('Facebook Pixel no está cargado');
    }
}

// Manejar clic en botón de WhatsApp
function handleWhatsAppClick() {
    if (!eventId) {
        console.error('Event ID no generado');
        return;
    }

    // Enviar evento a Facebook Pixel
    sendFacebookEvent('ClickWhatsApp', eventId);

    // Registrar el clic en el backend
    registerEvent(eventId, 'whatsapp_click');

    // Crear mensaje de WhatsApp con el event_id
    const message = CONFIG.defaultMessage + eventId;
    const encodedMessage = encodeURIComponent(message);

    // Crear URL de WhatsApp
    const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodedMessage}`;

    // Redirigir a WhatsApp
    window.open(whatsappUrl, '_blank');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Generar event_id al cargar la página
    generateEventId();

    // Agregar listener al botón de WhatsApp
    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', handleWhatsAppClick);
    }

    // Enviar PageView a Facebook Pixel con event_id
    sendFacebookEvent('PageView', eventId);
});
