// Configuration Service (Centralized)
// Used by both client and server to validate and retrieve critical configuration.

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
  console.log("[ENV_DIAGNOSTIC] getConfig() called");
  const isServer = typeof window === 'undefined';

  let supabaseUrl = "";
  let supabaseAnonKey = "";
  let supabaseServiceRoleKey = "";
  let geminiApiKey = "";

  if (isServer) {
    supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL) || 
                  cleanValue(process.env.SUPABASE_URL) || 
                  'https://pexnbsizyunpaomaoxmd.supabase.co';
    supabaseAnonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY) || 
                      cleanValue(process.env.SUPABASE_ANON_KEY) || 
                      cleanValue(process.env.SUPABASE_KEY) || 
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTMxOTIsImV4cCI6MjA5NjUyOTE5Mn0.1xzlB5DlIL50dKsDKqHSylofc7A8afQheyOUqJyLzy4';
    supabaseServiceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY) || 
                             'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk1MzE5MiwiZXhwIjoyMDk2NTI5MTkyfQ.Vfofpr83FxgG3YuoS1X-fCmojzS4DGQsgY0AswoWPiY';
    geminiApiKey = cleanValue(process.env.GEMINI_API_KEY);
  } else {
    // Client-side: read from import.meta.env, with fallbacks to window bindings filled by synchronous server fetch
    supabaseUrl = cleanValue(import.meta.env.VITE_SUPABASE_URL as string) || 
                  cleanValue((window as any).__SUPABASE_URL) || 
                  cleanValue((window as any).VITE_SUPABASE_URL) || 
                  'https://pexnbsizyunpaomaoxmd.supabase.co';
                  
    supabaseAnonKey = cleanValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
                      cleanValue((window as any).__SUPABASE_ANON_KEY) || 
                      cleanValue((window as any).VITE_SUPABASE_ANON_KEY) || 
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTMxOTIsImV4cCI6MjA5NjUyOTE5Mn0.1xzlB5DlIL50dKsDKqHSylofc7A8afQheyOUqJyLzy4';
    // Note: SERVICE_ROLE_KEY and GEMINI_API_KEY MUST NOT be accessed on client-side.
  }

  const errors: string[] = [];
  if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
    errors.push("URL do Supabase (VITE_SUPABASE_URL) ausente ou inválida.");
  }
  if (!isValidKey(supabaseAnonKey)) {
    errors.push("Chave anônima do Supabase (VITE_SUPABASE_ANON_KEY) ausente ou inválida.");
  }
  if (isServer) {
    if (!isValidKey(supabaseServiceRoleKey)) {
      errors.push("Chave de serviço do Supabase (SUPABASE_SERVICE_ROLE_KEY) ausente ou inválida no servidor.");
    }
    if (!isValidKey(geminiApiKey)) {
      errors.push("API Key do Gemini (GEMINI_API_KEY) ausente ou inválida no servidor.");
    }
  }

  const supabaseConfigured = supabaseUrl.startsWith("https://") && isValidKey(supabaseAnonKey) && (!isServer || isValidKey(supabaseServiceRoleKey));
  const geminiConfigured = !isServer || isValidKey(geminiApiKey);

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
