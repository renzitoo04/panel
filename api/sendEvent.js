const fetch = require('node-fetch'); // Necesitarás instalar este paquete: npm install node-fetch

module.exports = async (req, res) => {
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

    // Para solicitudes GET, retornar un estatus simple
    if (req.method === 'GET') {
      return res.status(200).json({ status: 'API operativa' });
    }

    // Para solicitudes POST, procesar el evento de Facebook
    if (req.method === 'POST') {
      const { eventName = 'Contactar', eventData = {} } = req.body;

      const pixelId = process.env.PIXEL_ID || process.env.FACEBOOK_PIXEL_ID;
      const accessToken = eventData.access_token || process.env.FB_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

      if (!pixelId || !accessToken) {
        console.error('❌ Error: Faltan variables de entorno necesarias para Facebook');
        return res.status(500).json({
          error: 'Configuración de Facebook incompleta',
          details: 'Configurar PIXEL_ID y FB_TOKEN en variables de entorno'
        });
      }

      // Obtener datos de evento
      const fbp = eventData.fbp || '';
      const fbc = eventData.fbc || '';
      const eventId = eventData.event_id || `server_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const eventTime = eventData.event_time || Math.floor(Date.now() / 1000);
      const sourceUrl = eventData.event_source_url || req.headers.referer || 'https://tusitio.com';

      // Construir datos de usuario para la API
      const userData = {
        client_ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        client_user_agent: req.headers['user-agent']
      };
      
      if (fbp) userData.fbp = fbp;
      if (fbc) userData.fbc = fbc;

      // Datos para la API de Conversiones de Facebook
      const data = JSON.stringify({
        data: [{
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          user_data: userData,
          custom_data: eventData
        }]
      });

      // Preparar payload para la API de Facebook con deduplicación
      const payload = {
        data: [
          {
            event_name: eventName,
            event_time: eventTime,
            action_source: 'website',
            event_source_url: sourceUrl,
            event_id: eventId,  // Incluir el ID para deduplicación
            user_data: userData,
            custom_data: eventData
          }
        ]
      };

      try {
        // Usar fetch para llamar a la API de Conversiones de Facebook
        const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          console.log('Evento enviado correctamente a Facebook:', data);
          return res.status(200).json({ 
            success: true, 
            data,
            event_id: eventId,  // Devolver el ID para referencia
            deduplication: true
          });
        } else {
          console.error('Error al enviar evento a Facebook:', data);
          return res.status(response.status).json({ error: 'Error en API de Facebook', details: data });
        }
      } catch (error) {
        console.error('Error en la solicitud a la API de Facebook:', error);
        return res.status(500).json({ error: 'Error en la solicitud a la API de Facebook' });
      }
    } else {
      return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error) {
    console.error('Error general:', error);
    return res.status(500).json({ error: error.message });
  }
};
