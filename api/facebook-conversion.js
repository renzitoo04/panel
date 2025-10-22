const fetch = require('node-fetch');

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

    // Obtener variables de entorno (normalizar nombres entre proyectos)
    const pixelId = process.env.PIXEL_ID || process.env.FACEBOOK_PIXEL_ID;
    const accessToken = process.env.FB_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    
    if (!pixelId || !accessToken) {
      console.error('❌ Error: Faltan variables de entorno necesarias para Facebook');
      return res.status(500).json({ 
        error: 'Configuración de Facebook incompleta',
        details: 'Revisar variables de entorno PIXEL_ID/FACEBOOK_PIXEL_ID y FB_TOKEN/FACEBOOK_ACCESS_TOKEN'
      });
    }

    // Extraer datos del cuerpo de la solicitud con validación mejorada
    const {
      event_id = `server_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      event_name = 'Contact', // Evento estándar de Facebook para contacto
      fbp = '',
      fbc = '',
      event_source_url = req.headers.referer || 'https://tusitio.com',
      test_event_code = null,
      event_time = Math.floor(Date.now() / 1000),
      value = null,
      currency = null,
      access_token = null
    } = req.body || {};

    // Si se proporciona un token en el cuerpo, úsalo, sino usa el de las variables de entorno
    const tokenToUse = access_token || accessToken;

    if (!tokenToUse) {
      console.error('❌ Error: No se proporcionó token de acceso');
      return res.status(500).json({
        error: 'Token de acceso no disponible',
        details: 'Configurar FB_TOKEN en variables de entorno'
      });
    }

    // CORRECCIÓN: asegurarse de que estamos usando el event_id del cliente para deduplicación
    console.log('📝 Usando event_id para deduplicación:', event_id);
    
    // Construir objeto de usuario con información enriquecida
    const userData = {
      client_ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '1.1.1.1',
      client_user_agent: req.body.user_agent || req.headers['user-agent'] || '',
    };
    
    // Añadir fbp y fbc solo si existen
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    // Construir datos personalizados
    const customData = {};
    if (value !== null && currency !== null) {
      customData.value = value;
      customData.currency = currency;
    }

    // Crear payload completo para la API de Facebook
    const payload = {
      data: [{
        event_name: event_name, // Usar el nombre del evento proporcionado (por defecto "Contact")
        event_time: event_time,
        action_source: "website",
        event_source_url: event_source_url,
        event_id: event_id, // Asegurarse de usar el mismo ID que viene del cliente
        user_data: userData,
        custom_data: customData
      }]
    };

    // Añadir test_event_code si está presente
    if (test_event_code) {
      payload.test_event_code = test_event_code;
    }

    console.log('📤 Enviando evento a Facebook:', JSON.stringify(payload, null, 2));

    try {
      // Enviar a la API de Facebook con manejo mejorado de errores
      const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${tokenToUse}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Respuesta exitosa de Facebook:', result);
        return res.status(200).json({ 
          success: true, 
          result,
          event_id: event_id,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ Error de la API de Facebook:', result);
        return res.status(response.status).json({ 
          error: 'Error en la API de Facebook',
          details: result,
          payload_sent: payload,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error al hacer la solicitud a Facebook:', error);
      return res.status(500).json({ 
        error: 'Error al comunicarse con la API de Facebook',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error general en el procesamiento:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
