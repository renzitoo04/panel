const axios = require('axios');
const crypto = require('crypto');

/**
 * Función para hashear datos con SHA-256
 * @param {string} data - El dato a hashear
 * @return {string} El hash en minúsculas
 */
function hashData(data) {
  if (!data) return '';
  return crypto.createHash('sha256').update(String(data).toLowerCase().trim()).digest('hex');
}

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

    console.log('📤 Iniciando prueba de API de Conversiones de Facebook');

    // Obtener variables de entorno o usar valores del cuerpo
    const pixelId = req.body?.pixel_id || process.env.PIXEL_ID;
    const accessToken = req.body?.access_token || process.env.FB_TOKEN;
    const testEventCode = req.body?.test_event_code || process.env.TEST_EVENT_CODE || 'TEST1332';
    const eventName = req.body?.event_name || 'TestEvent';
    const email = req.body?.email || 'test@example.com';

    if (!pixelId || !accessToken) {
      console.error('❌ Error: Faltan pixelId o accessToken');
      return res.status(400).json({
        error: 'Faltan parámetros obligatorios',
        details: 'Se requiere PIXEL_ID y FB_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    // Datos del evento
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `test_${eventTime}_${Math.random().toString(36).substring(2, 10)}`;

    // Hashear el email con SHA-256
    const hashedEmail = hashData(email);
    
    // Datos de usuario
    const userData = {
      client_ip_address: req.headers['x-forwarded-for'] || '203.0.113.1', // IP simulada
      client_user_agent: req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      em: hashedEmail
    };

    // Datos personalizados (opcional)
    const customData = req.body?.custom_data || {};

    // Crear payload completo para la API de Facebook
    const payload = {
      data: [{
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        user_data: userData,
        custom_data: customData
      }],
      test_event_code: testEventCode
    };

    console.log('📤 Enviando evento de prueba con estos datos:', JSON.stringify(payload, null, 2));

    try {
      // Enviar solicitud a la API de Facebook usando axios
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('✅ Evento enviado correctamente a Facebook:', response.data);
      
      // Devolver respuesta completa para análisis
      return res.status(200).json({
        success: true,
        facebook_response: response.data,
        event_details: {
          pixel_id: pixelId,
          event_id: eventId,
          event_name: eventName,
          event_time: eventTime,
          test_event_code: testEventCode
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error en la API de Facebook:', error.response?.data || error.message);
      
      return res.status(500).json({
        error: 'Error al enviar evento a Facebook',
        details: error.response?.data || error.message,
        request_payload: payload,
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
