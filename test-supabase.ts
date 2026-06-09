import dotenv from 'dotenv';
dotenv.config({ override: true });

import { createClient } from '@supabase/supabase-js';

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\s+/g, '');
const key = (process.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/\s+/g, '');

console.log("Config (URL: 10 chars, KEY: 10 chars):", { url: url.substring(0, 10), key: key.substring(0, 10) });

if (!url || !key) {
  console.error("Missing SUPABASE URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  // Test with a table that should exist, e.g., 'residents'
  const { data, error } = await supabase.from('residents').select('*').limit(1);
  
  if (error) {
    console.error("Test Error:", error);
  } else {
    console.log("Test Success (Fetched 1 resident):", data);
  }
}

test();
