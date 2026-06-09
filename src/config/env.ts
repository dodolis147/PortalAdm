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
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTMxOTIsImV4cCI6MjA5NjUyOTE5Mn0.1xzlB5DlIL50dKsDKqHSylofc7A8afQheyOUqJyLzy4';
    supabaseServiceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY) || 
                             'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk1MzE5MiwiZXhwIjoyMDk2NTI5MTkyfQ.Vfofpr83FxgG3YuoS1X-fCmojzS4DGQsgY0AswoWPiY';
    geminiApiKey = cleanValue(process.env.GEMINI_API_KEY || '');
  } else {
    // Client-side: Read EXCLUSIVELY from import.meta.env
    supabaseUrl = cleanValue(import.meta.env.VITE_SUPABASE_URL as string) || 
                  cleanValue((window as any).__SUPABASE_URL) || 
                  cleanValue((window as any).VITE_SUPABASE_URL) || 
                  'https://pexnbsizyunpaomaoxmd.supabase.co';
    supabaseAnonKey = cleanValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
                      cleanValue((window as any).__SUPABASE_ANON_KEY) || 
                      cleanValue((window as any).VITE_SUPABASE_ANON_KEY) || 
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTMxOTIsImV4cCI6MjA5NjUyOTE5Mn0.1xzlB5DlIL50dKsDKqHSylofc7A8afQheyOUqJyLzy4';
    supabaseServiceRoleKey = ''; // Not accessible on client
    geminiApiKey = ''; // Not accessible on client
  }

  const errors: string[] = [];

  const isUrlValid = supabaseUrl !== "" && 
                     supabaseUrl.startsWith("https://") &&
                     supabaseUrl.includes(".supabase.");

  const isAnonValid = isValidKey(supabaseAnonKey);

  if (!supabaseUrl) {
    errors.push(`A URL do Supabase (VITE_SUPABASE_URL) está ausente do ambiente. (Ambiente: ${JSON.stringify(import.meta.env)})`);
  } else if (!isUrlValid) {
    errors.push(`A URL do Supabase possui formato inválido: "${supabaseUrl}"`);
  }

  if (!supabaseAnonKey) {
    errors.push(`A chave anônima (VITE_SUPABASE_ANON_KEY) está ausente do ambiente. (Ambiente: ${JSON.stringify(import.meta.env)})`);
  } else if (!isAnonValid) {
    errors.push("A chave anônima (VITE_SUPABASE_ANON_KEY) é inválida.");
  }

  const supabaseConfigured = isUrlValid && isAnonValid;
  const geminiConfigured = isServer ? (!!geminiApiKey && geminiApiKey.length > 10) : true;
  
  const isValid = supabaseConfigured && geminiConfigured;

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
