// api/facebook-campaign-info.js
import fetch from 'node-fetch';

const FACEBOOK_API_VERSION = 'v18.0';

export async function getFacebookCampaignInfo(eventId) {
  try {
    const pixelId = process.env.PIXEL_ID || process.env.FACEBOOK_PIXEL_ID;
    const accessToken = process.env.FB_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      console.error('❌ Error: Facebook credentials not found');
      return null;
    }

    // Construir URL de la API de Facebook
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pixelId}/events` +
                `?access_token=${accessToken}` +
                `&event_id=${eventId}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('Error from Facebook API:', data);
      return null;
    }

    const event = data.data?.[0];
    if (!event) {
      console.error('No event found in Facebook response');
      return null;
    }

    return {
      campaign_id: event.custom_data?.campaign_id,
      fbclid: event.user_data?.fbc || event.custom_data?.fbclid,
      fbc: event.user_data?.fbc,
      fbp: event.user_data?.fbp
    };
  } catch (error) {
    console.error('Error getting campaign info from Facebook:', error);
    return null;
  }
}