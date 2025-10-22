// lib/event-handler.js
import { upsertEventByEventId } from './database.js';
import { getFacebookCampaignInfo } from '../api/facebook-campaign-info.js';

export async function handleEventCreation(eventData) {
  try {
    // Primero, intentar obtener la información de campaña de Facebook
    const fbInfo = await getFacebookCampaignInfo(eventData.event_id);
    
    // Si tenemos información de Facebook, agregarla al evento
    if (fbInfo) {
      eventData.attribution = {
        ...eventData.attribution,
        campaign_id: fbInfo.campaign_id,
        fbclid: fbInfo.fbclid,
        fbc: fbInfo.fbc,
        fbp: fbInfo.fbp
      };
    }

    // Guardar el evento en Supabase
    const savedEvent = await upsertEventByEventId(eventData);
    return savedEvent;

  } catch (error) {
    console.error('Error handling event creation:', error);
    throw error;
  }
}