// Configuration Service (Centralized - Pure Server-side)
// Used exclusively by server to retrieve configuration without referencing import.meta.

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  geminiApiKey: string;
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
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

export function getConfig(): AppConfig {
  console.log("[ENV_DIAGNOSTIC] getConfig() called on server");

  const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL) || 
                      cleanValue(process.env.SUPABASE_URL) || 
                      'https://pexnbsizyunpaomaoxmd.supabase.co';
  const supabaseAnonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY) || 
                          cleanValue(process.env.SUPABASE_ANON_KEY) || 
                          cleanValue(process.env.SUPABASE_KEY) || 
                          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTMxOTIsImV4cCI6MjA5NjUyOTE5Mn0.1xzlB5DlIL50dKsDKqHSylofc7A8afQheyOUqJyLzy4';
  const supabaseServiceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY) || 
                                 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk1MzE5MiwiZXhwIjoyMDk2NTI5MTkyfQ.Vfofpr83FxgG3YuoS1X-fCmojzS4DGQsgY0AswoWPiY';
  const geminiApiKey = cleanValue(process.env.GEMINI_API_KEY);

  const errors: string[] = [];
  if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
    errors.push("URL do Supabase (VITE_SUPABASE_URL) ausente ou inválida.");
  }
  if (!isValidKey(supabaseAnonKey)) {
    errors.push("Chave anônima do Supabase (VITE_SUPABASE_ANON_KEY) ausente ou inválida.");
  }
  if (!isValidKey(supabaseServiceRoleKey)) {
    errors.push("Chave de serviço do Supabase (SUPABASE_SERVICE_ROLE_KEY) ausente ou inválida no servidor.");
  }
  if (!isValidKey(geminiApiKey)) {
    errors.push("API Key do Gemini (GEMINI_API_KEY) ausente ou inválida no servidor.");
  }

  const supabaseConfigured = supabaseUrl.startsWith("https://") && isValidKey(supabaseAnonKey) && isValidKey(supabaseServiceRoleKey);
  const geminiConfigured = isValidKey(geminiApiKey);

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    geminiApiKey,
    supabaseConfigured,
    geminiConfigured,
    isValid: supabaseConfigured && geminiConfigured,
    errors,
  };
}
