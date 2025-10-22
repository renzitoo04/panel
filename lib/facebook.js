// lib/facebook.js
import fetch from 'node-fetch';

const FACEBOOK_API_VERSION = 'v18.0';

export async function getFacebookEventInfo(pixelId, accessToken, eventId) {
  try {
    // Consultar la API de Facebook para obtener información del evento
    const response = await fetch(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pixelId}/events` +
      `?access_token=${accessToken}` +
      `&event_id=${eventId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error consultando API de Facebook:', data);
      return null;
    }

    // Extraer información relevante
    const event = data.data?.[0];
    if (!event) {
      console.error('No se encontró información del evento en Facebook');
      return null;
    }

    return {
      campaign_id: event.custom_data?.campaign_id || event.custom_data?.utm_campaign,
      fbclid: event.user_data?.fbclid || event.custom_data?.fbclid,
      fbc: event.user_data?.fbc,
      fbp: event.user_data?.fbp
    };
  } catch (error) {
    console.error('Error al consultar API de Facebook:', error);
    return null;
  }
}