// lib/database.js
import { supabase } from './supabase.js';

// ============== EVENTS ==============
export async function upsertEventByEventId(event) {
  // upsert por event_id para deduplicar
  const { data, error } = await supabase
    .from('events')
    .upsert(event, { onConflict: 'event_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
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

// ============== LANDINGS / SETTINGS ==============
// Tabla objetivo en Supabase: `settien`
export async function upsertLandingSettings(landing_id, pixel_id, access_token, name = null, active = true) {
  const payload = {
    landing_id,
    pixel_id: pixel_id || null,
    access_token: access_token || null,
    name: name || null,
    active: !!active,
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

export async function getLandingSettings(landing_id) {
  const { data, error } = await supabase
    .from('settien')
    .select('*')
    .eq('landing_id', landing_id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLandingSettings(landing_id) {
  const { data, error } = await supabase
    .from('settien')
    .delete()
    .eq('landing_id', landing_id);
  if (error) throw error;
  return data;
}
