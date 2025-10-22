// Script independiente para probar el evento Lead en la API de Conversiones de Meta
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
 * Función principal para probar el evento Lead en la API de Meta
 */
async function testLeadEvent() {
  try {
    console.log('🧪 Iniciando prueba del evento LEAD en la API de conversiones de Meta');

    // Obtener parámetros desde variables de entorno
    const pixelId = process.env.PIXEL_ID || '1226357339184266'; // Actualizado con el nuevo ID del pixel
    const accessToken = process.env.FB_TOKEN || 'EAAR7uPgFvj8BO2WoA8r9ZCZCtL70WDOs7OaLNQAuxNFCSewnN52LbA43EGBhF0vkAUSHy0A0WGZAgIB8gD6ZAZCEQjAJmZBBZA17DK5tadY0Wf8GnhZAS2maQZAC35qgvyzTBtsbZBFUYFen8Wfphy6gsOQMG7jDOMvV9x25oZBlVi1YyJmnp7YAfamrndzvktgPgZDZD';
    const testEventCode = process.env.TEST_EVENT_CODE || 'TEST1332';
    
    // Verificar que tenemos los valores necesarios
    if (!pixelId || !accessToken) {
      console.error('❌ Error: Faltan variables de entorno necesarias para Facebook');
      console.error('Por favor asegúrate de que PIXEL_ID y FB_TOKEN estén definidos en tu archivo .env');
      process.exit(1);
    }

    console.log(`📋 Usando Pixel ID: ${pixelId}`);
    console.log(`🔑 Código de prueba: ${testEventCode}`);

    // Configurar datos de prueba específicos para Lead
    const eventName = 'Lead';
    const email = 'lead@example.com';
    const hashedEmail = hashData(email);
    const eventId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const eventTime = Math.floor(Date.now() / 1000);
    
    // Crear payload para la API de conversiones específico para Lead
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
          value: 1.00,
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

    console.log('\n✅ Prueba del evento LEAD completada con éxito!');
    console.log('📊 Respuesta de Meta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.events_received) {
      console.log(`\n🎉 Se recibieron ${response.data.events_received} eventos LEAD correctamente.`);
    }
    
    // Mostrar detalles adicionales para ayudar al diagnóstico
    console.log('\n📝 Detalles del evento LEAD enviado:');
    console.log(`- Evento: ${eventName}`);
    console.log(`- ID: ${eventId}`);
    console.log(`- Timestamp: ${eventTime}`);
    console.log(`- Email original: ${email}`);
    console.log(`- Email hasheado: ${hashedEmail}`);
    console.log(`- Test event code: ${testEventCode}`);
    
  } catch (error) {
    console.error('\n❌ Error en la prueba del evento LEAD:');
    
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
testLeadEvent();
