// Script independiente para probar la API de Conversiones de Facebook
require('dotenv').config();
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

/**
 * Función principal para probar la API de Facebook
 */
async function testFacebookConversionAPI() {
  try {
    console.log('🧪 Iniciando prueba directa de la API de conversiones de Meta');

    // Obtener parámetros desde variables de entorno
    const pixelId = process.env.PIXEL_ID || process.env.FACEBOOK_PIXEL_ID;
    const accessToken = process.env.FB_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    const testEventCode = process.env.TEST_EVENT_CODE;
    
    // Verificar que tenemos los valores necesarios
    if (!pixelId || !accessToken) {
      console.error('❌ Error: Faltan variables de entorno necesarias para Facebook');
      console.error('Por favor asegúrate de que PIXEL_ID y FB_TOKEN estén definidos en tu archivo .env');
      process.exit(1);
    }

    console.log(`📋 Usando Pixel ID: ${pixelId}`);    console.log(`🔑 Código de prueba: ${testEventCode}`);

    // Configurar datos de prueba
    const eventName = 'TestEvent'; // Específicamente usando TestEvent para este script
    const email = 'test@example.com';
    const hashedEmail = hashData(email);
    const eventId = `test_event_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const eventTime = Math.floor(Date.now() / 1000);
    
    // Crear payload para la API de conversiones
    const payload = {
      data: [{
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        user_data: {
          client_ip_address: '203.0.113.1', // IP simulada
          client_user_agent: 'Mozilla/5.0 (Test User Agent)',
          em: hashedEmail
        },
        custom_data: {
          value: 49.99,
          currency: 'USD'
        }
      }],
      test_event_code: testEventCode
    };

    console.log(`📤 Enviando evento "${eventName}" a Meta con ID: ${eventId}`);
    
    // Realizar la petición a la API de Facebook
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log('\n✅ Prueba completada con éxito!');
    console.log('📊 Respuesta de Meta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.events_received) {
      console.log(`\n🎉 Se recibieron ${response.data.events_received} eventos correctamente.`);
    }
    
    // Mostrar detalles adicionales para ayudar al diagnóstico
    console.log('\n📝 Detalles del evento enviado:');
    console.log(`- Evento: ${eventName}`);
    console.log(`- ID: ${eventId}`);
    console.log(`- Timestamp: ${eventTime}`);
    console.log(`- Email original: ${email}`);
    console.log(`- Email hasheado: ${hashedEmail}`);
    console.log(`- Test event code: ${testEventCode}`);
    
  } catch (error) {
    console.error('\n❌ Error en la prueba:');
    
    if (error.response) {
      // Error de la API de Facebook
      console.error('Error en la respuesta de la API de Meta:');
      console.error(JSON.stringify(error.response.data, null, 2));
      console.error(`Código de estado: ${error.response.status}`);
    } else if (error.request) {
      // Error de conexión
      console.error('No se pudo conectar a la API de Meta:');
      console.error(error.message);
    } else {
      // Otro tipo de error
      console.error('Error inesperado:');
      console.error(error.message);
    }
    
    // Proporcionar sugerencias para resolver el problema
    console.log('\n🔍 Consejos para solucionar el problema:');
    console.log('1. Verifica que tu token de acceso sea válido y no haya expirado');
    console.log('2. Confirma que el ID del Pixel es correcto');
    console.log('3. Asegúrate de que el test_event_code esté configurado correctamente en tu cuenta de Meta');
    console.log('4. Revisa las variables de entorno en tu archivo .env');
    
    process.exit(1);
  }
}

// Ejecutar la función principal
testFacebookConversionAPI();
