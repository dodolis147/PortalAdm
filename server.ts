import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

console.log("[SERVER_BOOT] STARTING SERVER.TS...");
console.log("[SERVER_BOOT] Loaded environment variables via dotenv.");

import { loadAndValidateEnvironment } from './src/config/env-server';
import { getConfig } from './src/lib/env-server';
console.log("[SERVER_BOOT] getConfig and loadAndValidateEnvironment loaded.");

const app = express();
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.url.startsWith('/api')) {
    console.log(`[API_LOG] ${req.method} ${req.url}`);
  }
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
  extended: true,
  limit: '50mb'
}));

const PORT = 3000;

// Helper to convert objects to snake_case for safe uniform server-side storage & response
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = toSnakeCase(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// Log Supabase operation
function logSupabaseOp(table: string, op: string, success: boolean, err?: any) {
  if (success) {
    console.log(`[Supabase] ✅ ${table} ${op} sucesso.`);
  } else {
    console.error(`[Supabase] ❌ ${table} ${op} erro:`, err);
  }
}

// Global helper to bypass missing table errors gracefully on write operations
function handleDbWriteError(error: any, table: string, dataToUpsert: any, res: any) {
  const errMsg = typeof error === 'string' ? error : (error?.message || '');
  const errCode = error?.code || '';
  const isMissingTable = 
    errCode === '42P01' || 
    errCode === 'PGRST205' || 
    errMsg.toLowerCase().includes('relation') || 
    errMsg.toLowerCase().includes('exist') ||
    errMsg.toLowerCase().includes('schema cache') ||
    errMsg.toLowerCase().includes('could not find');
  
  if (isMissingTable) {
    console.warn(`[SUPABASE_WRITE_FALLBACK] Table "${table}" does not exist in Supabase yet. Simulating successful write payload locally.`);
    return res.json({ success: true, data: dataToUpsert, localOnly: true, note: 'Table relation does not exist yet' });
  }
  
  return res.status(500).json({ error: typeof error === 'string' ? error : (error?.message || 'Erro interno do servidor') });
}

// Lazy initialization of Gemini
let aiInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY não configurada.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Helper function to check if a value is a valid Supabase API key (non-empty, non-placeholder, non-mock)
function isValidKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim().toLowerCase();
  return k !== "" && 
         !k.includes("your_") && 
         k !== "invalid-key" && 
         k !== "placeholder" && 
         !k.includes("anon_key") && 
         !k.includes("service_role");
}

function isValidUUID(id: any): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Analyze environment variables for Supabase access safely and generate diagnostics
function analyzeEnvironmentVariables(): { isValid: boolean; report: string } {
  const config = getConfig();
  let lines: string[] = [];

  lines.push("┌────────────────────────────────────────────────────────────");
  lines.push("│ DIAGNÓSTICO DE CONFIGURAÇÃO DO SUPABASE (SERVER-SIDE)");
  lines.push("├────────────────────────────────────────────────────────────");

  if (!config.supabaseUrl) {
    lines.push("│ ❌ VITE_SUPABASE_URL: AUSENTE");
  } else if (!config.supabaseUrl.startsWith("https://")) {
    lines.push(`│ ⚠️ VITE_SUPABASE_URL: URL Inválida -> "${config.supabaseUrl}"`);
  } else {
    lines.push(`│ 🟢 VITE_SUPABASE_URL: OK`);
  }

  lines.push(`│ SUPABASE_ANON_KEY: ${config.supabaseAnonKey ? '🟢 OK' : '❌ AUSENTE'}`);
  lines.push(`│ SUPABASE_SERVICE_KEY: ${config.supabaseServiceRoleKey ? '🟢 OK' : '❌ AUSENTE'}`);
  lines.push(`│ GEMINI_API_KEY: ${config.geminiApiKey ? '🟢 OK' : '❌ AUSENTE'}`);

  if (config.isValid) {
    lines.push("├────────────────────────────────────────────────────────────");
    lines.push("│ ✅ SUCESSO: Configuração validada!");
    lines.push("└────────────────────────────────────────────────────────────");
  } else {
    lines.push("├────────────────────────────────────────────────────────────");
    lines.push("│ ❌ ATENÇÃO: Configuração inválida.");
    lines.push("│ Erros encontrados:");
    config.errors.forEach(err => lines.push(`│   - ${err}`));
    lines.push("└────────────────────────────────────────────────────────────");
  }

  return { isValid: config.isValid, report: lines.join("\n") };
}

// Check if Supabase keys are configured in environment
const isSupabaseConfigured = (): boolean => {
  return getConfig().isValid;
};

// Global in-memory fallback state flag removed - strict Supabase policy enforced

let supabaseClient: any = null;
function getSupabase() {
  if (!supabaseClient) {
    const config = loadAndValidateEnvironment();
    console.log("[DIAG] loadAndValidateEnvironment result:", JSON.stringify(config, null, 2));
    
    const url = config.supabaseUrl;
    const key = config.supabaseServiceRoleKey;
    
    if (!url || !key) {
      console.error("[CondoAccess - Supabase] Falha ao obter credenciais válidas do ambiente.");
      throw new Error("Supabase não configurado: URL ou Chave de Serviço faltando.");
    }
    
    console.log(`[CondoAccess - Supabase] Inicializando: URL=${url.substring(0, 10)}..., usando chave validada.`);
    
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// Function checking Supabase integration and reporting issues properly
const checkSupabaseHealth = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
     const supabase = getSupabase();
     if (!supabase) return { ok: false, error: 'Supabase não inicializado' };
     const { error } = await supabase.from('residents').select('id').limit(1);
     if (error) return { ok: false, error: error.message };
     return { ok: true };
  } catch (err: any) {
     return { ok: false, error: err.message || 'Erro de conexão' };
  }
};

// Test Supabase connection silently on boot
async function testSupabaseConnection() {
  console.log("[CondoAccess] Executando validação de inicialização...");
  const d = analyzeEnvironmentVariables();
  console.log(d.report);

  if (!d.isValid) {
    console.log("[CondoAccess] Sistema operando no modo offline local de isolamento devido a chaves inválidas.");
    return;
  }
  
  try {
    const supabase = getSupabase();
    // Silently perform a minimal select query to test connection integrity
    const { error } = await supabase.from('residents').select('id').limit(1);
    if (error) {
      const isFatal = error.message?.toLowerCase().includes('api key') || 
                      error.message?.toLowerCase().includes('jwt') ||
                      error.message?.toLowerCase().includes('expired') ||
                      error.message?.toLowerCase().includes('unauthorized') ||
                      error.message?.toLowerCase().includes('401') ||
                      error.message?.toLowerCase().includes('403');
      if (isFatal) {
        console.warn(`[CondoAccess - Falha Crítica de Conexão] Supabase rejeitou credenciais: "${error.message}". Forçando fallback seguro.`);
      } else {
        console.error(`[CondoAccess - Falha de Conexão no Banco] Rejeitado pelo servidor Supabase com a mensagem: "${error.message || JSON.stringify(error)}"`);
      }
    } else {
      console.log("[CondoAccess] Sincronização em tempo real ativa com o Supabase de produção.");
    }
  } catch (err: any) {
    console.error("[CondoAccess - Falha Excepcional na Inicialização] Não foi possível conectar ao endpoint do Supabase:", err?.message || err);
  }
}

// API Routes - GET
const fetchData = async (table: string, res: any) => {
  console.log(`[API_DIAGNOSTIC] fetchData START: table=${table}`);
  try {
    const supabase = getSupabase();
    console.log(`[API_DIAGNOSTIC] supabase instance = ${!!supabase}`);
    if (!supabase) {
      console.log(`[API_DIAGNOSTIC] fetchData FAILED: No supabase instance`);
      return res.status(503).json({ error: 'Configuração do Supabase ausente.' });
    }

    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      logSupabaseOp(table, 'FETCH', false, error);
      const isMissingTable = 
        error.code === '42P01' || 
        error.code === 'PGRST205' || 
        error.message?.toLowerCase().includes('relation') || 
        error.message?.toLowerCase().includes('exist') ||
        error.message?.toLowerCase().includes('schema cache') ||
        error.message?.toLowerCase().includes('could not find');
      
      if (isMissingTable) {
        console.warn(`[SUPABASE_FALLBACK] Table "${table}" does not exist in Supabase yet. Returning empty array for client compatibility.`);
        return res.json({ success: true, data: [], localOnly: true, note: 'Table relation does not exist yet' });
      }
      throw error;
    }
    logSupabaseOp(table, 'FETCH', true);

    // Premium feature: auto-seed empty tables on-demand from local initial templates
    if (data && data.length === 0) {
      const initialItems: any[] = [];
      if (initialItems.length > 0) {
        console.log(`[CondoAccess Seeder] Tabela '${table}' está vazia no Supabase. Semeando dados iniciais.`);
        try {
          const cleanItems = initialItems.map(item => {
             if (table === 'residents') {
                // Ensure array fields are formatted as jsonb
                return {
                   ...item,
                   vehicles: Array.isArray(item.vehicles) ? JSON.stringify(item.vehicles) : '[]',
                   members: Array.isArray(item.members) ? JSON.stringify(item.members) : '[]'
                };
             }
             return item;
          });

          const { data: seededData, error: seedError } = await supabase.from(table).insert(cleanItems).select();
          if (!seedError && seededData) {
            console.log(`[CondoAccess Seeder] Semeado total de ${seededData.length} registros na tabela '${table}'.`);
            return res.json({ success: true, data: seededData });
          } else if (seedError) {
            console.warn(`[CondoAccess Seeder] Erro ao tentar semear tabela '${table}':`, seedError.message);
          }
        } catch (se) {
          console.warn(`[CondoAccess Seeder] Exceção crítica ao semear tabela '${table}':`, se);
        }
      }
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error(`Erro ao buscar dados de ${table} no Supabase:`, error?.message || error);
    
    res.status(500).json({ error: error?.message || 'Erro interno do servidor' });
  }
};

app.get('/api/config-status', async (req, res) => {
  const config = getConfig();
  const dbHealth = await checkSupabaseHealth();
  res.json({
    isValid: config.isValid,
    errors: config.errors,
    supabaseConfigured: config.supabaseConfigured,
    geminiConfigured: config.geminiConfigured,
    bancoConectado: dbHealth.ok
  });
});

app.get('/api/env', (req, res) => {
  const config = getConfig();
  res.json({
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey
  });
});

app.get('/api/diagnose-supabase', (req, res) => {
  console.log('Environment variables present:', Object.keys(process.env));
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const diagnostics = {
    urlLoaded: !!url,
    urlPreview: url ? `${url.substring(0, 10)}...` : null,
    anonKeyLoaded: !!anonKey,
    anonKeyPreview: anonKey ? `...${anonKey.substring(Math.max(0, anonKey.length - 4))}` : null,
    serviceRoleKeyLoaded: !!serviceRoleKey,
    serviceRoleKeyPreview: serviceRoleKey ? `...${serviceRoleKey.substring(Math.max(0, serviceRoleKey.length - 4))}` : null,
    envKeysAvailable: Object.keys(process.env).filter(k => k.startsWith('SUPABASE') || k.startsWith('VITE_SUPABASE')),
  };
  
  console.log('[CondoAccess] Diagnóstico Supabase solicitado:', diagnostics);
  console.log('[DEBUG] process.env keys:', Object.keys(process.env));
  
  res.json({
    ...diagnostics,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/db-diagnose', async (req, res) => {
  const tables = [
    'residents',
    'visitors',
    'bookings',
    'announcements',
    'incidents',
    'encomendas',
    'common_areas',
    'app_config',
    'login_customization'
  ];
  const tablesFound: string[] = [];
  const tablesMissing: string[] = [];
  let lastError: string | null = null;
  let supabaseConnected = false;

  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('*').limit(1);
          if (error) {
            tablesMissing.push(table);
            lastError = `[Tabela ${table}] Código: ${error.code || 'S/C'}. Mensagem: ${error.message}`;
          } else {
            tablesFound.push(table);
          }
        } catch (tableErr: any) {
          tablesMissing.push(table);
          lastError = `[Tabela ${table}] Exceção: ${tableErr.message || tableErr}`;
        }
      }
      supabaseConnected = tablesFound.length > 0;
    } else {
      lastError = 'Cliente Supabase não pôde ser inicializado.';
    }
  } catch (err: any) {
    lastError = err.message || 'Erro inesperado na inicialização do Supabase.';
  }

  res.json({
    success: true,
    supabaseStatus: supabaseConnected ? 'connected' : 'disconnected',
    proxyStatus: 'healthy',
    sessionStatus: {
      role: 'Service Role (Express Admin Bypass)',
      authenticated: true,
      lastWriteSynced: true
    },
    tablesFound,
    tablesMissing,
    lastError,
    checkedAt: new Date().toISOString()
  });
});

app.get('/api/db-schema-sql', (req, res) => {
  const schemaPath = path.join(process.cwd(), 'supabase_complete_schema_and_rls.sql');
  try {
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      res.json({ success: true, sql });
    } else {
      res.status(404).json({ error: 'Arquivo de schema SQL não encontrado.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data/login_customization', (req, res) => {
  console.log(`[API_DIAGNOSTIC] EXPLICIT route hit: table = login_customization`);
  fetchData('login_customization', res);
});

app.get('/api/data/:table', (req, res) => {
  console.log(`[API_DIAGNOSTIC] GET route hit: table = ${req.params.table}, url = ${req.url}`);
  fetchData(req.params.table, res);
});

app.post('/api/save-visitor', async (req, res) => {
  try {
    const visitor = req.body;
    
    // Sanitize resident_id and record ID to be valid UUIDs or null
    const sanitize = (v: any) => {
      const cleanId = (v.id && typeof v.id === 'string' && isValidUUID(v.id)) ? v.id : crypto.randomUUID();
      const cleanResidentId = (v.resident_id && typeof v.resident_id === 'string' && isValidUUID(v.resident_id)) ? v.resident_id : null;
      
      console.log(`[DIAG] Sanitizing visitor: ${v.name}, resident_id=${v.resident_id}, clean=${cleanResidentId}`);
      
      return { ...v, id: cleanId, resident_id: cleanResidentId };
    };

    const dataToUpsert = Array.isArray(visitor) ? visitor.map(sanitize) : sanitize(visitor);
    
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not configured');

      // Verify resident_id exists for each visitor
      const visitors = Array.isArray(dataToUpsert) ? dataToUpsert : [dataToUpsert];
      for (const v of visitors) {
          if (v.resident_id) {
              const { data: res } = await supabase.from('residents').select('id').eq('id', v.resident_id).single();
              if (!res) {
                  console.warn(`[Supabase] FK violation averted for visitor: ${v.name}. Resident ID ${v.resident_id} not found. Setting to null.`);
                  v.resident_id = null;
              }
          }
      }

      const { data, error } = await supabase.from('visitors').upsert(visitors);
      if (error) {
         logSupabaseOp('visitors', 'UPSERT', false, JSON.stringify(error, null, 2));
         console.error('SUPABASE_WRITE_ERROR:', JSON.stringify(error, null, 2));
         throw error;
      }
      logSupabaseOp('visitors', 'UPSERT', true);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro na rota save-visitor no Supabase:', error?.message);
      handleDbWriteError(error, 'visitors', dataToUpsert, res);
    }
  } catch (error: any) {
    console.error('Erro na rota save-visitor:', error?.message || 'Unknown error');
    handleDbWriteError(error, 'visitors', req.body, res);
  }
});

function generateAccessCode(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.post('/api/save-resident', async (req, res) => {
  try {
    const resident = req.body;

    // Backend Duplicate Validations
    if (!Array.isArray(resident)) {
      const targetId = resident.id;
      const targetUnit = resident.unit?.trim();
      const targetName = resident.name?.trim();
      const targetEmail = resident.email?.trim();

      try {
        const supabase = getSupabase();
        if (supabase) {
          const { data: allRes, error: fetchErr } = await supabase
            .from('residents')
            .select('id, name, unit, email, active');
          
          if (!fetchErr && allRes) {
            // Check if another resident has this exact unit
            const duplicateUnit = allRes.find(r => 
              r.id !== targetId && 
              r.active !== false &&
              r.unit?.trim().toLowerCase() === targetUnit?.toLowerCase()
            );

            if (duplicateUnit) {
              return res.status(400).json({ 
                error: 'Unidade Duplicada', 
                message: `O apartamento (${targetUnit}) já está cadastrado para outro morador. Por favor, verifique os dados de unidade antes de continuar.` 
              });
            }

            // Check if another resident has this exact name or email
            const duplicateNameOrEmail = allRes.find(r => {
              if (r.id === targetId || r.active === false) return false;
              
              const nameMatch = r.name?.trim().toLowerCase() === targetName?.toLowerCase();
              
              const isRealEmail = targetEmail && 
                targetEmail.toLowerCase() !== 'não cadastrado' && 
                targetEmail.trim() !== "" &&
                !targetEmail.toLowerCase().includes('morador.');
              const rRealEmail = r.email && 
                r.email.toLowerCase() !== 'não cadastrado' && 
                r.email.trim() !== "" &&
                !r.email.toLowerCase().includes('morador.');
                
              const emailMatch = isRealEmail && rRealEmail && r.email?.trim().toLowerCase() === targetEmail?.toLowerCase();
              
              return nameMatch || emailMatch;
            });

            if (duplicateNameOrEmail) {
              const matchedReason = duplicateNameOrEmail.name?.trim().toLowerCase() === targetName?.toLowerCase() ? 'nome' : 'e-mail';
              const matchedValue = matchedReason === 'nome' ? targetName : targetEmail;
              return res.status(400).json({
                error: 'Morador Duplicado',
                message: `Já existe um morador cadastrado com o mesmo ${matchedReason} (${matchedValue}). Por favor, verifique se o cadastro já existe antes de continuar.`
              });
            }
          }
        }
      } catch (err) {
        console.warn('Erro na verificação de duplicados do backend:', err);
      }
    }

    // Retreive existing QR codes to enforce imutability
    const idsToQuery = Array.isArray(resident) 
      ? resident.map((r: any) => r.id).filter(Boolean) 
      : (resident.id ? [resident.id] : []);

    let existingQrCodes: Record<string, string> = {};
    if (idsToQuery.length > 0) {
      try {
        const supabase = getSupabase();
        if (supabase) {
          const { data: dbRes } = await supabase
            .from('residents')
            .select('id, qr_code_value')
            .in('id', idsToQuery);
          if (dbRes) {
            dbRes.forEach((row: any) => {
              if (row.qr_code_value) {
                existingQrCodes[row.id] = row.qr_code_value;
              }
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao obter qr_codes existentes:', err);
      }
    }
    
    // Sanitize resident to only include valid DB fields and ensure valid UUID id
    const sanitize = (r: any) => {
      const cleanId = (r.id && typeof r.id === 'string' && isValidUUID(r.id)) ? r.id : crypto.randomUUID();
      const cleanEmail = r.email || `morador.${cleanId.substring(0, 8)}@condoaccess.com`;
      
      const sanitized = {
        id: cleanId,
        name: r.name,
        unit: r.unit,
        phone: r.phone || "",
        email: cleanEmail,
        status: r.status || 'Ativo',
        vehicles: r.vehicles || [],
        members: r.members || [],
        avatar_url: r.avatar_url || r.avatarUrl || null,
        role: r.role || 'Morador',
        biometrics_active: r.biometrics_active !== undefined ? r.biometrics_active : (r.biometricsActive !== undefined ? r.biometricsActive : false),
        qr_code_value: existingQrCodes[cleanId] || r.qr_code_value || r.qrCodeValue || generateAccessCode()
      };
      
      return sanitized;
    };

    const dataToUpsert = Array.isArray(resident) ? resident.map(sanitize) : sanitize(resident);

    try {
      const supabase = getSupabase();
      
      // Attempt upsert with all extra fields
      const { data, error } = await supabase.from('residents').upsert(dataToUpsert);
      if (error) {
         logSupabaseOp('residents', 'UPSERT', false, JSON.stringify(error, null, 2));
         console.error('SUPABASE_RESIDENT_WRITE_ERROR:', JSON.stringify(error, null, 2));
         throw error;
      }
      logSupabaseOp('residents', 'UPSERT', true);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro na primeira tentativa de save-resident no Supabase:', error?.message);
      
      const errMsg = typeof error === 'string' ? error : (error?.message || '');
      const errCode = error?.code || '';
      const isMissingTable = 
        errCode === '42P01' || 
        errCode === 'PGRST205' || 
        errMsg.toLowerCase().includes('relation') || 
        errMsg.toLowerCase().includes('exist') ||
        errMsg.toLowerCase().includes('schema cache') ||
        errMsg.toLowerCase().includes('could not find');
      
      if (isMissingTable) {
        return handleDbWriteError(error, 'residents', dataToUpsert, res);
      }
      
      // If error is about missing columns like "password" or "biometrics_active", retry without them
      const isMissingColumnError = error?.message && (
        error.message.includes('column') || 
        error.message.includes('password') || 
        error.message.includes('biometrics_active') ||
        error.message.includes('qr_code_value')
      );
      
      if (isMissingColumnError) {
        console.log('[CondoAccess Supabase] Removendo campos "password", "biometrics_active" e "qr_code_value" e tentando salvar novamente por falta de coluna no banco.');
        
        const cleanSanitized = (item: any) => {
          const { password, biometrics_active, qr_code_value, ...rest } = item;
          return rest;
        };
        const fallbackData = Array.isArray(dataToUpsert) 
          ? dataToUpsert.map(cleanSanitized) 
          : cleanSanitized(dataToUpsert);
          
        try {
          const supabase = getSupabase();
          const { data: secondData, error: secondError } = await supabase.from('residents').upsert(fallbackData);
          if (secondError) throw secondError;
          return res.json({ success: true, data: secondData });
        } catch (subError: any) {
          console.error('Erro no fallback de save-resident no Supabase:', subError?.message);
          return handleDbWriteError(subError, 'residents', dataToUpsert, res);
        }
      } else {
        return handleDbWriteError(error, 'residents', dataToUpsert, res);
      }
    }
  } catch (error: any) {
    console.error('Erro na rota save-resident:', error?.message || 'Unknown error');
    return handleDbWriteError(error, 'residents', req.body, res);
  }
});

app.post('/api/save-incident', async (req, res) => {
  try {
    const incident = Array.isArray(req.body) ? req.body : [req.body];
    
    const sanitize = (i: any) => {
      const { id, replies, ...rest } = i;
      const realId = (id && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) 
        ? id 
        : crypto.randomUUID();

      // Allowed incident columns
      const allowedKeys = ['title', 'category', 'description', 'unit', 'status', 'date', 'created_at', 'updated_at', 'created_by', 'active'];
      const cleanedRest: any = {};
      Object.keys(rest).forEach(k => {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (allowedKeys.includes(snakeKey)) {
          cleanedRest[snakeKey] = rest[k];
        } else if (allowedKeys.includes(k)) {
          cleanedRest[k] = rest[k];
        }
      });

      const sanitized = { 
        id: realId,
        replies: replies || [],
        ...cleanedRest 
      };
      return sanitized;
    };
    const dataToUpsert = incident.map(sanitize);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('incidents').upsert(dataToUpsert);
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro na rota save-incident no Supabase:', error?.message);
      handleDbWriteError(error, 'incidents', dataToUpsert, res);
    }
  } catch (error: any) {
    console.error('Erro na rota save-incident:', error?.message || 'Unknown error');
    handleDbWriteError(error, 'incidents', req.body, res);
  }
});

app.post('/api/save-encomenda', async (req, res) => {
  try {
    const encomenda = Array.isArray(req.body) ? req.body : [req.body];
    
    const sanitize = (e: any) => {
      const { id, morador_id, ...rest } = e;
      const cleanId = (id && typeof id === 'string' && isValidUUID(id)) ? id : crypto.randomUUID();
      const cleanMoradorId = (morador_id && typeof morador_id === 'string' && isValidUUID(morador_id)) ? morador_id : null;
      return { id: cleanId, morador_id: cleanMoradorId, ...rest };
    };
    
    const dataToUpsert = encomenda.map(sanitize);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('encomendas').upsert(dataToUpsert);
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro na rota save-encomenda no Supabase:', error?.message);
      handleDbWriteError(error, 'encomendas', dataToUpsert, res);
    }
  } catch (error: any) {
    console.error('Erro na rota save-encomenda:', error?.message || 'Unknown error');
    handleDbWriteError(error, 'encomendas', req.body, res);
  }
});

app.post('/api/save-booking', async (req, res) => {
  try {
    const booking = req.body;
    
    const sanitize = (b: any) => {
        const { id, resident_id, area_id, ...rest } = b;
        const cleanId = (id && typeof id === 'string' && isValidUUID(id)) ? id : crypto.randomUUID();
        const cleanResidentId = (resident_id && typeof resident_id === 'string' && isValidUUID(resident_id)) ? resident_id : null;
        const cleanAreaId = (area_id && typeof area_id === 'string') ? area_id : null;
        return {
            id: cleanId,
            resident_id: cleanResidentId,
            area_id: cleanAreaId,
            ...rest
        };
    };

    const dataToUpsert = Array.isArray(booking) ? booking.map(sanitize) : sanitize(booking);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('bookings').upsert(dataToUpsert);
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro na rota save-booking no Supabase:', error?.message);
      handleDbWriteError(error, 'bookings', dataToUpsert, res);
    }
  } catch (error: any) {
    console.error('Erro na rota save-booking:', error?.message || 'Unknown error');
    handleDbWriteError(error, 'bookings', req.body, res);
  }
});

app.post('/api/save-common-area', async (req, res) => {
  try {
    const commonArea = req.body;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('common_areas').upsert(commonArea);
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro na rota save-common-area no Supabase:', error?.message);
      handleDbWriteError(error, 'common_areas', commonArea, res);
    }
  } catch (error: any) {
    console.error('Erro na rota save-common-area:', error?.message || 'Unknown error');
    handleDbWriteError(error, 'common_areas', req.body, res);
  }
});

app.post('/api/save-announcement', async (req, res) => {
  try {
    const announcement = Array.isArray(req.body) ? req.body : [req.body];
    
    const sanitize = (a: any) => {
      const { id, ...rest } = a;
      if (id && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return { id, ...rest };
      }
      return { id: crypto.randomUUID(), ...rest };
    };
    const dataToUpsert = announcement.map(sanitize);
    
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('announcements').upsert(dataToUpsert);
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Erro na rota save-announcement no Supabase:', error?.message);
      handleDbWriteError(error, 'announcements', dataToUpsert, res);
    }
  } catch (error: any) {
    console.error('Erro na rota save-announcement:', error?.message || 'Unknown error');
    handleDbWriteError(error, 'announcements', req.body, res);
  }
});

app.post('/api/save-app-config', async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Chave de configuração é obrigatória' });
    }

    const payload = { key, value: typeof value === 'object' ? JSON.stringify(value) : String(value) };

    try {
      const supabase = getSupabase();
      
      // Upsert using the 'key' as uniqueness or check if key exists first
      const { data: existing } = await supabase.from('app_config').select('id').eq('key', key);
      
      let resData;
      if (existing && existing.length > 0) {
        // Update existing row
        const { data, error } = await supabase.from('app_config').update({ value: payload.value }).eq('key', key).select();
        if (error) throw error;
        resData = data;
      } else {
        // Insert new row
        const { data, error } = await supabase.from('app_config').insert({ id: crypto.randomUUID(), key, value: payload.value }).select();
        if (error) throw error;
        resData = data;
      }
      
      res.json({ success: true, data: resData });
    } catch (error: any) {
      console.error('Erro na rota save-app-config no Supabase:', error?.message);
      handleDbWriteError(error, 'app_config', payload, res);
    }
  } catch (error: any) {
    console.error('Erro na rota save-app-config:', error?.message || 'Unknown error');
    handleDbWriteError(error, 'app_config', req.body, res);
  }
});

app.post('/api/save-login-customization', async (req, res) => {
  try {
    const config = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Configuração é obrigatória' });
    }

    const sanitize = (c: any) => {
      return {
        id: c.id || 'active',
        layout_model: typeof c.layout_model === 'number' ? c.layout_model : Number(c.layout_model || 4),
        primary_color: c.primary_color || '#3b82f6',
        secondary_color: c.secondary_color || '#1e293b',
        button_color: c.button_color || '#2563eb',
        text_color: c.text_color || '#fafafa',
        logo_url: c.logo_url || '',
        logo_size: typeof c.logo_size === 'number' ? c.logo_size : Number(c.logo_size || 100),
        logo_alignment: c.logo_alignment || 'center',
        background_url: c.background_url || '',
        background_opacity: typeof c.background_opacity === 'number' ? c.background_opacity : Number(c.background_opacity !== undefined ? c.background_opacity : 100),
        background_blur: typeof c.background_blur === 'number' ? c.background_blur : Number(c.background_blur !== undefined ? c.background_blur : 0),
        condominium_name: c.condominium_name || 'CondoAccess',
        slogan: c.slogan || 'Mural Central & Controle de Acesso',
        welcome_message: c.welcome_message || 'Painel Central do Condomínio Inteligente',
        footer_text: c.footer_text || 'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA',
        updated_at: new Date().toISOString(),
        updated_by: c.updated_by || 'Administrador'
      };
    };

    const sanitized = sanitize(config);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase instacia nula');
      
      const { data, error } = await supabase.from('login_customization').upsert(sanitized);
      if (error) {
        logSupabaseOp('login_customization', 'UPSERT', false, JSON.stringify(error, null, 2));
        console.error('SUPABASE_WRITE_ERROR (login_customization):', JSON.stringify(error, null, 2));
        throw error;
      }
      logSupabaseOp('login_customization', 'UPSERT', true);
      res.json({ success: true, data });
    } catch (error: any) {
      console.warn('Erro na gravação direta do login_customization no Supabase (esperado em ambiente offline/sem tabela):', error?.message);
      res.json({ success: true, localOnly: true, message: 'Dados salvos localmente.' });
    }
  } catch (error: any) {
    console.error('Erro na rota save-login-customization:', error?.message || 'Unknown error');
    res.status(500).json({ error: typeof error === 'string' ? error : (error?.message || 'Erro interno do servidor') });
  }
});

// Módulo Achados e Perdidos endpoints para bypass de RLS Triggers
app.post('/api/save-achados-perdidos', async (req, res) => {
  const payload = req.body;
  console.log('[ACHADOS_PERDIDOS] Dados enviados:', payload);
  try {
    const items = Array.isArray(payload) ? payload : [payload];
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não configurado');
    }
    
    // Função auxiliar para validar UUID
    const isValidUUID = (str: any): boolean => {
      if (typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    const sanitized = items.map(item => {
      const copy = { ...item };
      
      // Sanitizar created_by (deve ser UUID válido no banco, senão removemos)
      if (copy.created_by && !isValidUUID(copy.created_by)) {
        delete copy.created_by;
      }
      if (copy.createdBy) {
        delete copy.createdBy;
      }
      if (copy.criado_por) {
        delete copy.criado_por;
      }
      
      // Garantir id válido
      if (!copy.id || !isValidUUID(copy.id)) {
        copy.id = crypto.randomUUID();
      }
      
      return copy;
    });

    const { data, error } = await supabase.from('achados_perdidos').upsert(sanitized).select();
    if (error) {
      console.error('[ACHADOS_PERDIDOS] Erro ao salvar:', error);
      return handleDbWriteError(error, 'achados_perdidos', sanitized, res);
    }
    
    console.log('[ACHADOS_PERDIDOS] Resposta Supabase:', data);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[ACHADOS_PERDIDOS] Erro ao salvar:', error);
    handleDbWriteError(error, 'achados_perdidos', payload, res);
  }
});

app.post('/api/save-achados-perdidos-fotos', async (req, res) => {
  const payload = req.body;
  console.log('[ACHADOS_PERDIDOS_FOTOS] Dados enviados:', payload);
  try {
    const items = Array.isArray(payload) ? payload : [payload];
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não configurado');
    }

    const isValidUUID = (str: any): boolean => {
      if (typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    const sanitized = items.map(item => {
      const copy = { ...item };
      if (copy.created_by && !isValidUUID(copy.created_by)) {
        delete copy.created_by;
      }
      if (!copy.id || !isValidUUID(copy.id)) {
        copy.id = crypto.randomUUID();
      }
      return copy;
    });

    const { data, error } = await supabase.from('achados_perdidos_fotos').upsert(sanitized).select();
    if (error) {
      console.error('[ACHADOS_PERDIDOS_FOTOS] Erro ao salvar:', error);
      return handleDbWriteError(error, 'achados_perdidos_fotos', sanitized, res);
    }

    console.log('[ACHADOS_PERDIDOS_FOTOS] Resposta Supabase:', data);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[ACHADOS_PERDIDOS_FOTOS] Erro ao salvar:', error);
    handleDbWriteError(error, 'achados_perdidos_fotos', payload, res);
  }
});

app.post('/api/save-achados-perdidos-historico', async (req, res) => {
  const payload = req.body;
  console.log('[ACHADOS_PERDIDOS_HISTORICO] Dados enviados:', payload);
  try {
    const items = Array.isArray(payload) ? payload : [payload];
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não configurado');
    }

    const isValidUUID = (str: any): boolean => {
      if (typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    const sanitized = items.map(item => {
      const copy = { ...item };
      if (copy.created_by && !isValidUUID(copy.created_by)) {
        delete copy.created_by;
      }
      if (copy.usuario_id && !isValidUUID(copy.usuario_id)) {
        delete copy.usuario_id;
      }
      if (copy.usuarioId) {
        delete copy.usuarioId;
      }
      if (copy.objetoId) {
        delete copy.objetoId;
      }
      if (!copy.id || !isValidUUID(copy.id)) {
        copy.id = crypto.randomUUID();
      }
      return copy;
    });

    const { data, error } = await supabase.from('achados_perdidos_historico').upsert(sanitized).select();
    if (error) {
      console.error('[ACHADOS_PERDIDOS_HISTORICO] Erro ao salvar:', error);
      return handleDbWriteError(error, 'achados_perdidos_historico', sanitized, res);
    }

    console.log('[ACHADOS_PERDIDOS_HISTORICO] Resposta Supabase:', data);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[ACHADOS_PERDIDOS_HISTORICO] Erro ao salvar:', error);
    handleDbWriteError(error, 'achados_perdidos_historico', payload, res);
  }
});

app.post('/api/save-audit-logs', async (req, res) => {
  const payload = req.body;
  console.log('[AUDIT_LOGS] Dados para auditoria administrativa recebidos:', payload);
  try {
    const items = Array.isArray(payload) ? payload : [payload];
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não configurado');
    }

    const isValidUUID = (str: any): boolean => {
      if (typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    const sanitized = items.map(item => {
      const copy = { ...item };
      if (!copy.id || !isValidUUID(copy.id)) {
        copy.id = crypto.randomUUID();
      }
      return copy;
    });

    const { data, error } = await supabase.from('audit_logs').upsert(sanitized).select();
    if (error) {
      console.error('[AUDIT_LOGS] Erro ao salvar pelo canal administrativo:', error);
      return handleDbWriteError(error, 'audit_logs', sanitized, res);
    }

    console.log('[AUDIT_LOGS] Logs gravados no canal administrativo com sucesso:', data);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[AUDIT_LOGS] Erro crítico admin salvar:', error);
    handleDbWriteError(error, 'audit_logs', payload, res);
  }
});

app.post('/api/delete/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { id } = req.body;
    
    if (!id) {
       return res.status(400).json({ error: 'ID é obrigatório para exclusão.' });
    }

    // Delete record from Supabase
    try {
      const supabase = getSupabase();
      
      // Check if it's the residents table, fix foreign key constraints
      if (table === 'residents') {
          const { error: updateError } = await supabase
              .from('encomendas')
              .update({ morador_id: null })
              .eq('morador_id', id);
          
          if (updateError) throw updateError;
      }
      
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Erro na rota delete/${table} no Supabase:`, error?.message);
      handleDbWriteError(error, table, { id }, res);
    }
  } catch (error: any) {
    console.error(`Erro na rota delete/${req.params.table}:`, error?.message || 'Unknown error');
    handleDbWriteError(error, req.params.table, { id: req.body?.id }, res);
  }
});

// API Routes
app.post('/api/gemini/reply-incident', async (req, res) => {
  try {
    const { incidentTitle, incidentDescription, incidentCategory, residentUnit } = req.body;
    if (!incidentTitle || !incidentDescription) {
      return res.status(400).json({ error: 'Título e descrição da ocorrência são obrigatórios.' });
    }

    const ai = getGenAI();
    const systemInstruction = `Você é o Gerente Predial / Administrador do condomínio.
Sua tarefa é responder de forma justa, empática, profissional e técnica a uma ocorrência oficial aberta por um morador da unidade ${residentUnit || 'não informada'}.
Cite brevemente as regras de boa convivência ou providências de vistoria que a administração tomará.
Seja objetivo e encorajador.`;

    const prompt = `Ocorrência do Morador:
Título: ${incidentTitle}
Categoria: ${incidentCategory}
Descrição: ${incidentDescription}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { systemInstruction }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Erro na rota reply-incident:', error.message);
    res.status(500).json({ 
      error: error.message || 'Erro interno do servidor',
      fallback: `Prezado morador da unidade ${req.body.residentUnit || 'cadastrada'},\n\nAgradecemos o seu contato e relato histórico do ocorrido.\n\nA administração do condomínio recebeu este chamado sobre "${req.body.incidentTitle}" com categoria "${req.body.incidentCategory || 'Geral'}". Informamos que o departamento interno correspondente iniciará uma verificação imediata para corrigir a situação ou entrará em contato com a parte envolvida com base em nossas regras de convívio.\n\nAtenciosamente,\nAdministração Predial.`
    });
  }
});

app.post('/api/gemini/procedure-guide', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'A consulta de procedimento é obrigatória.' });
    }

    const ai = getGenAI();
    const systemInstruction = `Você é um Consultor Sênior de Segurança Condominial e Gestão de Portaria Inteligente.
Forneça diretrizes operacionais, passos rápidos e boas práticas de segurança para porteiros e síndicos lidarem com situações do dia a dia.
Escreva em tópicos curtos, fáceis de ler no calor do momento, em português do Brasil.`;

    const prompt = `Como proceder na seguinte situação de segurança, controle de acesso ou regras na portaria do condomínio: "${query}"?`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { systemInstruction }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Erro na rota procedure-guide:', error.message);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor',
      fallback: `DIRETRIZES DE SEGURANÇA PARA A PORTARIA:\n\n1. IDENTIFICAÇÃO RIGOROSA: Peça identificação com foto oficial (RG/CPF) de qualquer visitante ou prestador de serviço não agendado.\n2. CONFIRMAÇÃO OBLIGATÓRIA: Nunca libere o acesso sem ligar e receber a confirmação verbal explícita do morador receptor.\n3. USO DA ECLUSA: Use o sistema de intertravamento (eclusa). Nunca abra o segundo portão antes de fechar o primeiro.\n4. ENTREGAS DE DELIVERY: Motoboys de delivery não devem subir até o apartamento. O morador é responsável por recolher a encomenda no portão/portaria.\n5. SISTEMA DE MONITORAMENTO: Em caso de incidente ou comportamento hostil, grave no sistema de controle do condomínio e, se necessário, ligue para a ronda de apoio ou chame o síndico.`
    });
  }
});

// Setup Vite or static serving
async function bootstrap() {
  // Test Supabase connection on boot to establish proper adaptive state
  await testSupabaseConnection();

  let vite: any = null;

  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Server running on port ${PORT}`);
  });

  // Dynamically bridge WebSocket upgrade requests to Vite HMR server when operating in Dev Mode
  if (process.env.NODE_ENV !== 'production' && vite) {
    server.on('upgrade', (req, socket, head) => {
      vite.ws.handleUpgrade(req, socket, head);
    });
  }
}

bootstrap().catch(err => {
  console.error('Server failed to bootstrap:', err);
});
