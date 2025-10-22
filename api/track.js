// api/track.js
import { handleEventCreation } from '../lib/event-handler.js';
import { sendToFacebookConversionAPI } from './facebook-conversion.js';

export default async (req, res) => {
  try {
    // Configuración CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Manejar solicitudes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Extraer datos del evento
    const eventData = {
      event_id: req.body.event_id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: new Date().toISOString(),
      client_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      landing_id: req.body.landing_id || 'default',
      whatsapp_clicked: req.body.whatsapp_clicked || false,
      has_message: false,
      has_purchase: false,
      attribution: {
        utm_source: req.body.utm_source,
        utm_medium: req.body.utm_medium,
        utm_campaign: req.body.utm_campaign,
        utm_content: req.body.utm_content,
        utm_term: req.body.utm_term,
        fbclid: req.body.fbclid,
        gclid: req.body.gclid
      }
    };

    // Guardar el evento y obtener información de campaña
    const savedEvent = await handleEventCreation(eventData);

    // Enviar evento a Facebook
    const facebookResponse = await sendToFacebookConversionAPI(eventData.event_id, 'PageView', {
      client_ip: eventData.client_ip,
      user_agent: req.headers['user-agent'],
      event_source_url: req.headers.referer || 'https://tusitio.com'
    });

    res.status(200).json({
      success: true,
      event: savedEvent,
      facebook_response: facebookResponse
    });

  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};