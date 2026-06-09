import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { loadAndValidateEnvironment } from './src/config/env-server';

const env = loadAndValidateEnvironment();
const url = env.supabaseUrl;
const key = env.supabaseServiceRoleKey;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(url, key);

const TABLES = [
  'residents',
  'visitors',
  'bookings',
  'announcements',
  'incidents',
  'encomendas',
  'common_areas',
  'app_config',
  'achados_perdidos',
  'achados_perdidos_fotos',
  'achados_perdidos_historico',
  'login_customization'
];

async function checkAll() {
  console.log("Checking all Supabase tables:");
  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.error(`❌ Table '${table}' check error:`, error.message, `(Code: ${error.code})`);
      } else {
        console.log(`🟢 Table '${table}' exists. Count fetched: ${data ? data.length : 0}`);
      }
    } catch (e: any) {
      console.error(`❌ Exception checking table '${table}':`, e.message || e);
    }
  }
}

checkAll();
