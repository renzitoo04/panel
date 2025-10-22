// lib/database.js
import { supabase } from './supabase.js';

// ============== EVENTS ==============
import { getFacebookEventInfo } from './facebook.js';

export async function upsertEventByEventId(event) {
  try {
    // Normalizar atribución
    if (!event.attribution) {
      event.attribution = {};
    }

    // Si viene utm_campaign o fbclid en el evento, guardarlos
    if (event.utm_campaign) {
      event.attribution.utm_campaign = event.utm_campaign;
    }
    if (event.fbclid) {
      event.attribution.fbclid = event.fbclid;
    }

    // Obtener credenciales de Facebook (usando las variables de entorno por defecto)
    const pixelId = process.env.PIXEL_ID || process.env.FACEBOOK_PIXEL_ID;
    const accessToken = process.env.FB_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

    // Consultar Facebook para obtener información del evento
    const fbInfo = await getFacebookEventInfo(pixelId, accessToken, event.event_id);

    // Añadir información de Facebook al evento
    if (fbInfo) {
      event.attribution = {
        ...event.attribution,
        campaign_id: fbInfo.campaign_id,
        fbclid: fbInfo.fbclid,
        fbc: fbInfo.fbc,
        fbp: fbInfo.fbp
      };
    }

    // Guardar evento enriquecido en Supabase
    const { data, error } = await supabase
      .from('events')
      .upsert(event, { onConflict: 'event_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en upsertEventByEventId:', error);
    throw error;
  }
}

export async function updateEvent(event_id, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('event_id', event_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getEvents(landingId = 'default', dateFrom = null, dateTo = null) {
  let q = supabase.from('events').select('*').eq('landing_id', landingId);
  if (dateFrom) q = q.gte('created_at', dateFrom);
  if (dateTo)   q = q.lte('created_at', dateTo);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Stats simplificadas en una pasada
export async function getEventStats(landingId = 'default', dateFrom = null, dateTo = null) {
  let q = supabase.from('events').select('has_purchase, purchase_value, whatsapp_clicked, has_message', { count: 'exact' })
               .eq('landing_id', landingId);
  if (dateFrom) q = q.gte('created_at', dateFrom);
  if (dateTo)   q = q.lte('created_at', dateTo);

  const { data, count, error } = await q;
  if (error) throw error;

  const purchases = data.filter(e => e.has_purchase);
  const stats = {
    totalEvents: count ?? 0,
    whatsappClicks: data.filter(e => e.whatsapp_clicked).length,
    messages: data.filter(e => e.has_message).length,
    purchases: purchases.length,
    totalRevenue: purchases.reduce((s, e) => s + Number(e.purchase_value || 0), 0)
  };
  return stats;
}

// ========== CAMPAIGN SPEND ==========
export async function upsertCampaignSpend(campaign_id, spend, currency = 'ARS') {
  const { data, error } = await supabase
    .from('campaign_spend')
    .upsert({ campaign_id, spend: Number(spend), currency }, { onConflict: 'campaign_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllCampaignSpend() {
  const { data, error } = await supabase.from('campaign_spend').select('*');
  if (error) throw error;
  const obj = {};
  for (const r of data) obj[r.campaign_id] = Number(r.spend);
  return obj;
}

// Obtener un evento por event_id (útil para depuración)
export async function getEventByEventId(event_id) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_id', event_id)
    .single();
  if (error) throw error;
  return data;
}

// ============== LANDINGS / SETTINGS ==============
export async function upsertLandingSettings(landing_id, pixel_id, access_token, name = null, active = true, defaultWhatsAppNumber = '', whatsappNumbers = []) {
  const payload = {
    landing_id,
    pixel_id: pixel_id || null,
    access_token: access_token || null,
    name: name || null,
    active: !!active,
    default_whatsapp_number: defaultWhatsAppNumber || null,
    whatsapp_numbers: whatsappNumbers || [],
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('settien')
    .upsert(payload, { onConflict: 'landing_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLandingSettings(landing_id = null) {
  let query = supabase.from('settien').select('*');
  if (landing_id) {
    query = query.eq('landing_id', landing_id).single();
  } else {
    query = query.order('updated_at', { ascending: false });
  }
  const { data, error } = await query;
  
  // Si se pidió un landing específico, convertir al formato esperado
  if (landing_id) {
    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }
    return data ? {
      id: data.landing_id,
      name: data.name,
      pixelId: data.pixel_id,
      accessToken: data.access_token,
      active: data.active,
      createdAt: data.created_at,
      defaultWhatsAppNumber: data.default_whatsapp_number || '',
      whatsappNumbers: data.whatsapp_numbers || []
    } : null;
  }
  
  // Si se pidieron todos, convertir array a objeto
  if (error) throw error;
  const landings = {};
  for (const row of data) {
    landings[row.landing_id] = {
      id: row.landing_id,
      name: row.name,
      pixelId: row.pixel_id,
      accessToken: row.access_token,
      active: row.active,
      createdAt: row.created_at,
      defaultWhatsAppNumber: row.default_whatsapp_number || '',
      whatsappNumbers: row.whatsapp_numbers || []
    };
  }
  return landings;
}

export async function deleteLandingSettings(landing_id) {
  const { data, error } = await supabase
    .from('settien')
    .delete()
    .eq('landing_id', landing_id);
  if (error) throw error;
  return data;
}

// ============== PANEL: NOTES & TASKS ==============
// Guardar/leer notas rápidas (por landing)
export async function getPanelNotes(landing_id = 'default') {
  const { data, error } = await supabase
    .from('panel_notes')
    .select('*')
    .eq('landing_id', landing_id)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data || null;
}

export async function upsertPanelNotes(landing_id = 'default', notes = '') {
  const payload = { landing_id, notes, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('panel_notes')
    .upsert(payload, { onConflict: 'landing_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Guardar/leer tareas (por landing)
export async function getPanelTasks(landing_id = 'default') {
  const { data, error } = await supabase
    .from('panel_tasks')
    .select('*')
    .eq('landing_id', landing_id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function upsertPanelTasks(landing_id = 'default', tasks = []) {
  const payload = { landing_id, tasks: Array.isArray(tasks) ? tasks : [], updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('panel_tasks')
    .upsert(payload, { onConflict: 'landing_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
