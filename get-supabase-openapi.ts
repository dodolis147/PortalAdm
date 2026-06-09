import dotenv from 'dotenv';
dotenv.config();

const url = (process.env.VITE_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

async function check() {
  if (!url || !key) {
    console.error("Missing credentials");
    return;
  }
  const endpoint = `${url}/rest/v1/`;
  console.log("Fetching OpenAPI from:", endpoint);
  try {
    const res = await fetch(endpoint, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    if (!res.ok) {
      console.error("HTTP error:", res.status, res.statusText);
      const text = await res.text();
      console.error("Response:", text);
      return;
    }
    const json = await res.json() as any;
    console.log("Metadata title:", json.info?.title);
    const definitions = json.definitions || {};
    const tables = Object.keys(definitions);
    console.log("Tables found in OpenAPI schema cache:", tables);
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
