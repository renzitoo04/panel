// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_KEY; // backend-only

if (!url || !serviceKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_KEY');
}

export const supabase = createClient(url, serviceKey);
