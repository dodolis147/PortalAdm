// Configuration Service (Centralized - Pure Server-side)
// Used exclusively by server to retrieve configuration without referencing import.meta.

export interface EnvironmentReport {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  geminiApiKey: string;
  
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
  bancoConectado: boolean;
  
  isValid: boolean;
  errors: string[];
}

function cleanValue(val: string | undefined): string {
  if (!val) return "";
  let cleaned = val.trim().replace(/\s+/g, "");
  cleaned = cleaned.replace(/^["']|["']$/g, "");
  const lower = cleaned.toLowerCase();
  if (lower === "undefined" || 
      lower === "null" || 
      lower === "" ||
      lower.includes("your_") || 
      lower === "placeholder" || 
      lower === "invalid-key") {
    return "";
  }
  return cleaned;
}

function isValidKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = cleanValue(key);
  return k.length > 10;
}

export function loadAndValidateEnvironment(): EnvironmentReport {
  console.log("[ENV_DIAGNOSTIC] loadAndValidateEnvironment() called on server");

  const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL) || 
                      cleanValue(process.env.SUPABASE_URL) || 
                      'https://pexnbsizyunpaomaoxmd.supabase.co';
  const supabaseAnonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY) || 
                        cleanValue(process.env.SUPABASE_ANON_KEY) || 
                        cleanValue(process.env.SUPABASE_KEY) || 
                        cleanValue(process.env.VITE_SUPABASE_KEY) || 
                        cleanValue(process.env.SUPABASE_ANON) || 
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTMxOTIsImV4cCI6MjA5NjUyOTE5Mn0.1xzlB5DlIL50dKsDKqHSylofc7A8afQheyOUqJyLzy4';
  const supabaseServiceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY) || 
                               cleanValue(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) || 
                               cleanValue(process.env.SERVICE_ROLE_KEY) || 
                               cleanValue(process.env.SUPABASE_SERVICE_KEY) || 
                               'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk1MzE5MiwiZXhwIjoyMDk2NTI5MTkyfQ.Vfofpr83FxgG3YuoS1X-fCmojzS4DGQsgY0AswoWPiY';
  const geminiApiKey = cleanValue(process.env.GEMINI_API_KEY);

  const errors: string[] = [];

  const isUrlValid = supabaseUrl !== "" && 
                     !supabaseUrl.toLowerCase().includes("your_") && 
                     supabaseUrl.startsWith("https://") &&
                     supabaseUrl.includes(".supabase.");

  const isAnonValid = isValidKey(supabaseAnonKey);

  if (!supabaseUrl) {
    errors.push("A URL do Supabase (VITE_SUPABASE_URL) está ausente do ambiente.");
  } else if (!isUrlValid) {
    errors.push(`A URL do Supabase possui formato inválido: "${supabaseUrl}"`);
  }

  if (!supabaseAnonKey) {
    errors.push("A chave anônima (VITE_SUPABASE_ANON_KEY) está ausente do ambiente.");
  } else if (!isAnonValid) {
    errors.push("A chave anônima (VITE_SUPABASE_ANON_KEY) é inválida ou usa valores de placeholder.");
  }

  const isServiceValid = isValidKey(supabaseServiceRoleKey);
  if (!supabaseServiceRoleKey) {
    errors.push("A chave de administrador (SUPABASE_SERVICE_ROLE_KEY) está ausente do ambiente do servidor.");
  } else if (!isServiceValid) {
    errors.push("A chave de administrador (SUPABASE_SERVICE_ROLE_KEY) é inválida ou usa valores de placeholder.");
  }

  const isGeminiValid = geminiApiKey !== "" && !geminiApiKey.includes("YOUR_") && geminiApiKey !== "MY_GEMINI_API_KEY";
  if (!geminiApiKey) {
    errors.push("A API Key do Gemini (GEMINI_API_KEY) está ausente do ambiente.");
  } else if (!isGeminiValid) {
    errors.push("A API Key do Gemini (GEMINI_API_KEY) é inválida ou usa valores de placeholder.");
  }

  const supabaseConfigured = isUrlValid && isAnonValid && isServiceValid;
  const geminiConfigured = isGeminiValid;
  
  // Overall validation
  const isValid = supabaseConfigured && geminiConfigured;

  if (typeof console !== 'undefined') {
    console.log(`[Config Status] Supabase: ${supabaseConfigured ? 'SIM' : 'NÃO'} | Gemini: ${geminiConfigured ? 'SIM' : 'NÃO'}`);
    if (errors.length > 0) {
      console.log(`[Pending Setup]: ${errors.length} item(s) to configure in Secrets.`);
    }
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    geminiApiKey,
    supabaseConfigured,
    geminiConfigured,
    bancoConectado: supabaseConfigured,
    isValid,
    errors
  };
}
