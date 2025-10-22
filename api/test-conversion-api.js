const axios = require('axios');
const crypto = require('crypto');

/**
 * Función para hashear datos con SHA-256 (requerido por la API de Facebook)
 * @param {string} data El dato a hashear
 * @return {string} Hash en formato hexadecimal
 */
function hashData(data) {
  if (!data) return '';
  return crypto.createHash('sha256').update(String(data).toLowerCase().trim()).digest('hex');
}

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Manejar preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Mostrar información básica para solicitudes GET
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'online',
        usage: 'Envía una solicitud POST a esta URL para probar la API de conversiones de Meta',
        documentation: 'Ver README para más detalles sobre los parámetros aceptados',
        supported_params: {
          event_name: 'Nombre del evento (por defecto: "TestEvent")',
          email: 'Email para prueba (será hasheado)',
          pixel_id: 'ID del pixel (opcional, usa el valor de .env por defecto)',
          access_token: 'Token de acceso (opcional, usa el valor de .env por defecto)',
          test_event_code: 'Código de evento de prueba (por defecto: de .env o "TEST1332")'
        }
      });
    }

    console.log('🧪 Iniciando prueba de la API de conversiones de Meta');

    // Obtener parámetros de solicitud o usar valores predeterminados
    const {
      event_name = 'TestEvent',
      email = 'test@example.com',
      pixel_id = process.env.PIXEL_ID || process.env.FACEBOOK_PIXEL_ID,
      access_token = process.env.FB_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN,
      test_event_code = process.env.TEST_EVENT_CODE || 'TEST1332',
      custom_data = {}
    } = req.body || {};

    // Validar que tenemos los valores necesarios
    if (!pixel_id || !access_token) {
      console.error('❌ Error: Faltan valores críticos');
      return res.status(400).json({
        error: 'Configuración incompleta',
        details: 'Se requiere un pixel_id y un access_token válidos',
        help: 'Proporciónelos en el cuerpo de la solicitud o configúrelos en variables de entorno'
      });
    }

    // Generar ID único para el evento
    const eventId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const eventTime = Math.floor(Date.now() / 1000);
    
    // Hashear el email según las especificaciones de Meta
    const hashedEmail = hashData(email);
    console.log(`📧 Email original: ${email}`);
    console.log(`📧 Email hasheado: ${hashedEmail}`);

    // Crear payload para la API de conversiones
    const payload = {
      data: [{
        event_name: event_name,
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        user_data: {
          client_ip_address: req.headers['x-forwarded-for'] || '203.0.113.1',
          client_user_agent: req.headers['user-agent'] || 'Mozilla/5.0 (Test User Agent)',
          em: hashedEmail
        },
        custom_data: custom_data
      }],
      test_event_code: test_event_code
    };

    console.log(`📤 Enviando evento "${event_name}" a Meta con ID: ${eventId}`);
    console.log(`🔧 Usando pixel ID: ${pixel_id}`);
    console.log(`🔑 Código de prueba: ${test_event_code}`);
    
    try {
      // Realizar la petición a la API de Facebook
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${pixel_id}/events?access_token=${access_token}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('✅ Respuesta de Meta:', response.data);
      
      // Devolver respuesta exitosa con todos los detalles
      return res.status(200).json({
        success: true,
        meta_response: response.data,
        event_details: {
          event_id: eventId,
          event_name: event_name,
          event_time: eventTime,
          test_event_code: test_event_code
        },
        email_details: {
          original: email,
          hashed: hashedEmail
        },
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      // Capturar errores específicos de la API
      console.error('❌ Error al comunicarse con la API de Meta:', apiError.response?.data || apiError.message);
      
      return res.status(500).json({
        error: 'Error en la API de Meta',
        details: apiError.response?.data || apiError.message,
        request_payload: payload,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    // Errores generales
    console.error('❌ Error general:', error);
    
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
