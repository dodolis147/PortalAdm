import React, { useState, useEffect, useRef } from 'react';
import { toSnakeCase, toCamelCase } from './lib/utils';
import { supabase } from './lib/supabase';
import { getConfig } from './lib/config';
import { useDexiePersistence, getTableForStore } from './lib/db';
import { 
  Building2, LayoutDashboard, Users, CalendarCheck, Megaphone, AlertTriangle, ShieldCheck, HelpCircle,
  Settings, Lock, Unlock, KeyRound, Eye, EyeOff, CheckCircle2, XCircle, Shield, Home, Key, Star, Layout, Package,
  X, Bell, Palette, QrCode, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Data types
import { Resident, Visitor, Booking, Announcement, Incident, IncidentReply, ThemeSettings, Encomenda, CommonArea, AuditLog, AchadosPerdidos, AchadosPerdidosFoto, AchadosPerdidosHistorico, LoginCustomization } from './types';
import { ProceduralQRCode } from './components/ProceduralQRCode';
import MercosulPlate from './components/MercosulPlate';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { residentsRepository } from './services/residentService';
import { visitorsRepository } from './services/visitorService';
import { bookingsRepository } from './services/bookingService';
import { announcementsRepository } from './services/announcementService';
import { incidentsRepository } from './services/incidentService';
import { encomendasRepository } from './services/encomendaService';
import { commonAreasRepository } from './services/commonAreaService';
import { achadosPerdidosRepository } from './services/achadosPerdidosService';
import { auditLogsRepository, pruneOldAuditLogs } from './services/auditLogService';
import { HealthCheckComponent } from './components/HealthCheck';
import AnnouncementModal from './components/AnnouncementModal';

const DEFAULT_LOGIN_CUSTOMIZATION: LoginCustomization = {
  id: 'active',
  layout_model: 4, // Model 4: Card Layout default
  primary_color: '#3b82f6',
  secondary_color: '#1e293b',
  button_color: '#2563eb',
  button_text_color: '#ffffff',
  text_color: '#fafafa',
  logo_url: '',
  logo_size: 100,
  logo_alignment: 'center',
  background_url: '',
  background_opacity: 100,
  background_blur: 0,
  condominium_name: 'CondoAccess',
  slogan: 'Mural Central & Controle de Acesso',
  welcome_message: 'Painel Central do Condomínio Inteligente',
  footer_text: 'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA',
  updated_at: new Date().toISOString(),
  updated_by: 'Administrador'
};

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  id: 'active',
  appName: 'CONDOACCESS',
  appSlogan: 'Mural Central & Controle de Acesso',
  logoUrl: '',
  logoIcon: 'Building2',
  presetId: 'classic',
  customBg: '#f8fafc',
  customCardBg: '#ffffff',
  customText: '#0f172a',
  customTextMuted: '#475569',
  customBorder: '#cbd5e1',
  customAccent: '#2563eb',
  towerNames: ['Torre 1', 'Torre 2', 'Torre 3']
};

// Custom Views (Code Splitting / Lazy Loading)
const DashboardView = React.lazy(() => import('./components/DashboardView'));
const VisitorsView = React.lazy(() => import('./components/VisitorsView'));
const ResidentsView = React.lazy(() => import('./components/ResidentsView'));
const BookingsView = React.lazy(() => import('./components/BookingsView'));
const AnnouncementsView = React.lazy(() => import('./components/AnnouncementsView'));
const IncidentsView = React.lazy(() => import('./components/IncidentsView'));
const EncomendasView = React.lazy(() => import('./components/EncomendasView'));
const AchadosPerdidosView = React.lazy(() => import('./components/AchadosPerdidosView'));
const AuditLogDashboard = React.lazy(() => import('./components/AuditLogDashboard'));
const AdminSettingsModal = React.lazy(() => import('./components/AdminSettingsModal'));
const AdminLockScreen = React.lazy(() => import('./components/AdminLockScreen'));
const ThemeCustomizerDrawer = React.lazy(() => import('./components/ThemeCustomizerDrawer'));
import Toast from './components/Toast';
import QRScannerModal from './components/QRScannerModal';
import ResidentProfileModal from './components/ResidentProfileModal';

const ConfigErrorOverlay = React.lazy(() => import('./components/ConfigErrorOverlay'));

const LoadingSpinnerFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] w-full py-16 animate-pulse" id="loading-spinner-fallback">
    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin mb-4" />
    <span className="text-zinc-400 text-xs font-black tracking-widest uppercase font-mono">Carregando painel...</span>
  </div>
);

// Custom hook for localStorage persistence
function useLocalStoragePersistence<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        const saved = localStorage.getItem(key);
        try {
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            console.error(`Error parsing localStorage key ${key}`, e);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.error(`Error saving to localStorage key ${key}:`, e);
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                // Handle quota exceeded, e.g., clear some old data or just warn
                console.warn(`Quota exceeded for localStorage key ${key}. Current data might not be persisted.`);
            }
        }
    }, [key, state]);

    return [state, setState];
}

interface PendingSyncItem {
  id: string;
  table: string;
  action: 'upsert' | 'delete';
  data: any;
  retries?: number;
}

const VALID_DB_COLUMN_MAP: Record<string, string[]> = {
  residents: [
    'id', 'name', 'unit', 'phone', 'email', 'vehicles', 'members', 'status', 'avatar_url', 'role', 'password', 'biometrics_active', 'created_at', 'updated_at'
  ],
  visitors: [
    'id', 'name', 'document', 'phone', 'type', 'unit_to_visit', 'resident_id', 'host_name', 'company', 'vehicle_plate', 'entry_time', 'exit_time', 'status', 'exit_code', 'notes', 'expiration_time', 'created_at', 'updated_at', 'validity_duration', 'auto_released'
  ],
  common_areas: [
    'id', 'name', 'capacity', 'description', 'rules', 'price', 'photo_url', 'created_at'
  ],
  bookings: [
    'id', 'area_id', 'unit', 'resident_name', 'resident_id', 'date', 'start_time', 'end_time', 'status', 'guests_count', 'guests', 'created_at', 'updated_at'
  ],
  announcements: [
    'id', 'title', 'content', 'category', 'date', 'author', 'attachment_url', 'created_at', 'updated_at', 'created_by', 'active'
  ],
  incidents: [
    'id', 'title', 'category', 'description', 'unit', 'status', 'date', 'replies', 'created_at', 'updated_at', 'created_by', 'active', 'deleted_at', 'deleted_by', 'deletion_reason'
  ],
  encomendas: [
    'id', 'codigo_rastreio', 'morador_id', 'morador_nome', 'apartamento', 'torre', 'data_recebimento', 'responsavel_recebimento', 'observacoes', 'foto_url', 'qr_code_value', 'status', 'data_retirada', 'quem_retirou', 'responsavel_entrega', 'created_at', 'updated_at', 'created_by', 'active'
  ],
  app_config: [
    'id', 'key', 'value', 'created_at', 'updated_at'
  ],
  login_customization: [
    'id', 'layout_model', 'primary_color', 'secondary_color', 'button_color', 'button_text_color', 'text_color', 'logo_url', 'logo_size', 'logo_alignment', 'background_url', 'background_opacity', 'background_blur', 'condominium_name', 'slogan', 'welcome_message', 'footer_text', 'updated_at', 'updated_by'
  ],
  achados_perdidos: [
    'id', 'nome', 'categoria', 'descricao', 'local_encontrado', 'data_encontrado', 'status', 'created_at', 'updated_at', 'created_by', 'active', 'proprietario_nome', 'proprietario_unidade', 'data_retirada', 'responsavel_entrega', 'assinatura_digital', 'foto_entrega', 'comprovacao_posse', 'documento_comprovatorio', 'solicitante_id', 'solicitante_nome', 'solicitante_unidade', 'solicitado_em', 'deleted_at', 'deleted_by', 'deletion_reason'
  ],
  achados_perdidos_fotos: [
    'id', 'objeto_id', 'url_foto', 'created_at', 'updated_at', 'created_by', 'active'
  ],
  achados_perdidos_historico: [
    'id', 'objeto_id', 'usuario_id', 'usuario_nome', 'acao', 'observacao', 'created_at', 'updated_at', 'created_by', 'active'
  ],
  audit_logs: [
    'id', 'created_at', 'user_id', 'user_name', 'action', 'module', 'record_id', 'old_data', 'new_data', 'ip_address', 'user_agent', 'error_message', 'stack_trace', 'restored_by', 'restored_at'
  ]
};

const isValidUUID = (str: any): boolean => {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const sanitizePayload = (table: string, data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizePayload(table, item));
  }

  const cleanData: any = {};
  const allowedColumns = VALID_DB_COLUMN_MAP[table];

  // Preemptive validation for any tables containing UUID fields to avoid Postgres casting syntax errors
  if (data.created_by && !isValidUUID(data.created_by)) {
    delete data.created_by;
  }
  if (data.createdBy && !isValidUUID(data.createdBy)) {
    delete data.createdBy;
  }
  if (data.resident_id && !isValidUUID(data.resident_id)) {
    delete data.resident_id;
  }
  if (data.residentId && !isValidUUID(data.residentId)) {
    delete data.residentId;
  }
  if (data.objeto_id && !isValidUUID(data.objeto_id)) {
    delete data.objeto_id;
  }
  if (data.objetoId && !isValidUUID(data.objetoId)) {
    delete data.objetoId;
  }
  if (data.usuario_id && !isValidUUID(data.usuario_id)) {
    delete data.usuario_id;
  }
  if (data.usuarioId && !isValidUUID(data.usuarioId)) {
    delete data.usuarioId;
  }

  if (allowedColumns) {
    const removedKeys: string[] = [];
    Object.keys(data).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedColumns.includes(snakeKey)) {
        cleanData[snakeKey] = data[key];
      } else if (allowedColumns.includes(key)) {
        cleanData[key] = data[key];
      } else {
        removedKeys.push(key);
      }
    });
    if (removedKeys.length > 0) {
      console.log(`[SYNC PREVENTATIVE SANITIZER] Table: ${table} | Ignored/Removed columns not in schema:`, removedKeys);
    }
  } else {
    Object.keys(data).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      cleanData[snakeKey] = data[key];
    });
  }

  return cleanData;
};

export default function App() {
  const envConfig = React.useMemo(() => getConfig(), []);
  const [bypassOverlay, setBypassOverlay] = useLocalStoragePersistence<boolean>('bypass_config_overlay', false);
  const showConfigOverlay = !envConfig.supabaseConfigured && !bypassOverlay;
  
  const [activeTab, setActiveTab] = useLocalStoragePersistence<'dashboard' | 'visitors' | 'residents' | 'bookings' | 'announcements' | 'incidents' | 'encomendas' | 'audit_logs' | 'achados_perdidos'>('activeTab', 'dashboard');

  const [pendingSyncQueue, setPendingSyncQueue] = useDexiePersistence<PendingSyncItem[]>('pendingSyncQueue', []);
  const pendingSyncQueueRef = useRef<PendingSyncItem[]>([]);
  
  // Realtime ref for persistence
  const realtimeRef = useRef<{
    channel: any;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
  }>({
    channel: null,
    reconnectTimer: null
  });
  
  useEffect(() => {
    pendingSyncQueueRef.current = pendingSyncQueue;
  }, [pendingSyncQueue]);

  useEffect(() => {
    async function syncEnvKeys() {
      try {
        const res = await fetch('/api/env');
        if (res.ok) {
          const data = await res.json();
          if (data && data.supabaseUrl && data.supabaseAnonKey) {
            const currentUrl = localStorage.getItem('__SUPABASE_URL') || '';
            const currentAnon = localStorage.getItem('__SUPABASE_ANON_KEY') || '';
            if (data.supabaseUrl !== currentUrl || data.supabaseAnonKey !== currentAnon) {
              console.log("[ENV_SYNC] Syncing keys from server:", data.supabaseUrl);
              localStorage.setItem('__SUPABASE_URL', data.supabaseUrl);
              localStorage.setItem('__SUPABASE_ANON_KEY', data.supabaseAnonKey);
              (window as any).__SUPABASE_URL = data.supabaseUrl;
              (window as any).__SUPABASE_ANON_KEY = data.supabaseAnonKey;
              window.location.reload();
            }
          }
        }
      } catch (err) {
        console.warn("[ENV_SYNC] Error syncing keys from server:", err);
      }
    }
    syncEnvKeys();
  }, []);

  // Idle Preload Tab Views Effect to guarantee instant zero-latency tab switching
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[PRELOAD] Prefetching lazy-load tab bundles in the background...");
      import('./components/DashboardView').catch(() => {});
      import('./components/VisitorsView').catch(() => {});
      import('./components/ResidentsView').catch(() => {});
      import('./components/BookingsView').catch(() => {});
      import('./components/AnnouncementsView').catch(() => {});
      import('./components/IncidentsView').catch(() => {});
      import('./components/EncomendasView').catch(() => {});
      import('./components/AchadosPerdidosView').catch(() => {});
      import('./components/AuditLogDashboard').catch(() => {});
      import('./components/AdminSettingsModal').catch(() => {});
      import('./components/ThemeCustomizerDrawer').catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const syncInProgressRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const syncTriggerRef = useRef<() => void>(() => {});
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const lastWriteTimeRef = useRef<number>(0);
  const isDirectChannelOfflineRef = useRef<boolean>(false);
  const lastFullFetchTimeRef = useRef<number>(Date.now());
  const verifiedTablesRef = useRef<Record<string, boolean>>({});

  const [syncLogs, setSyncLogs] = useDexiePersistence<{ id: string; timestamp: string; type: 'success' | 'error' | 'warning'; msg: string }[]>('syncLogs', []);

  const addSyncLog = (type: 'success' | 'error' | 'warning', msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logItem = {
      id: crypto.randomUUID(),
      timestamp,
      type,
      msg
    };
    console.log(`[SYNC_DIAGNOSTIC] [${type.toUpperCase()}] ${msg}`);
    if (type === 'error') console.error(`[SYNC_ERROR] ${msg}`);
    setSyncLogs(prev => [logItem, ...prev].slice(0, 50));
  };

  const addToSyncQueue = (table: string, action: 'upsert' | 'delete', data: any) => {
    lastWriteTimeRef.current = Date.now();
    const newItem: PendingSyncItem = {
      id: crypto.randomUUID(),
      table,
      action,
      data,
      retries: 0
    };
    setPendingSyncQueue(prev => [...prev, newItem]);
    addSyncLog('warning', `Novo item de sincronização adicionado para a tabela '${table}' (${action}).`);
    
    // Trigger sync if not in progress
    if (syncTriggerRef.current && !syncInProgressRef.current) {
        syncTriggerRef.current();
    }
  };

  // Refined Worker for processing synchronization queue sequentially and resiliently
  useEffect(() => {
    let active = true;

    const runSync = async () => {
      syncTriggerRef.current = runSync;
      if (!isMountedRef.current || pendingSyncQueueRef.current.length === 0 || syncInProgressRef.current) {
        if (pendingSyncQueueRef.current.length === 0 && !syncInProgressRef.current) {
          setSyncStatus('synced');
        }
        return;
      }
      
      syncInProgressRef.current = true;
      setSyncStatus('syncing');

      const item = pendingSyncQueueRef.current[0];
      const getSaveEndpointName = (table: string): string => {
        const mapping: { [key: string]: string } = {
          'residents': 'resident',
          'visitors': 'visitor',
          'bookings': 'booking',
          'announcements': 'announcement',
          'incidents': 'incident',
          'encomendas': 'encomenda',
          'common_areas': 'common-area',
          'app_config': 'app-config',
          'login_customization': 'login-customization',
          'achados_perdidos': 'achados-perdidos',
          'achados_perdidos_fotos': 'achados-perdidos-fotos',
          'achados_perdidos_historico': 'achados-perdidos-historico',
          'audit_logs': 'audit-logs'
        };
        return mapping[table] || table.replace(/_/g, '-');
      };
      let hasError = false;
      
      try {
        console.log(`[SYNC_WORKER] Iniciando sincronização do item ${item.id} da tabela '${item.table}'.`);
        
        // 1. Integridade Referencial Dinâmica para tabelas de Achados e Perdidos (Evita erros de constraint SQL FK)
        if (item.table === 'achados_perdidos_fotos' || item.table === 'achados_perdidos_historico') {
          const objetoId = item.data?.objeto_id || item.data?.objetoId;
          if (objetoId) {
            console.log(`[SYNC_INTEGRIDADE] Validando integridade/existência do objeto de ID '${objetoId}' para tabela '${item.table}'...`);
            
            // a. Verifica se o pai ainda está na fila aguardando sincronização de Cadastro
            const isParentPending = pendingSyncQueueRef.current.some((qItem, idx) => 
              idx > 0 && qItem.table === 'achados_perdidos' && 
              (qItem.data?.id === objetoId || qItem.data?.id_key === objetoId)
            );
            
            if (isParentPending) {
              addSyncLog('warning', `[INTEGRIDADE DEFER] O objeto pai '${objetoId}' ainda está na fila. Deferindo processamento de '${item.table}' para preservar ordem.`);
              setPendingSyncQueue(prev => {
                const filtered = prev.filter(i => i.id !== item.id);
                return [...filtered, item]; // Move o filho pro fim da fila
              });
              syncInProgressRef.current = false;
              return;
            }
            
            // b. Verifica diretamente no banco de dados Cloud para assegurar integridade
            const { data: parentRecord, error: checkError } = await supabase
              .from('achados_perdidos')
              .select('id')
              .eq('id', objetoId)
              .maybeSingle();
              
            if (checkError) {
              addSyncLog('error', `[INTEGRIDADE ERROR] Erro de rede ao buscar objeto pai '${objetoId}': ${checkError.message}`);
              throw checkError; // Ativa re-tentativa (ex: falhas temporárias)
            }
            
            if (!parentRecord) {
              // Registro órfão detectado! O pai não existe localmente na fila nem na nuvem
              addSyncLog('error', `[REGISTRO ÓRFÃO] Objeto principal de ID '${objetoId}' não existe no banco de dados para '${item.table}'. Descartando item com falha de integridade garantida.`);
              setPendingSyncQueue(prev => prev.filter(i => i.id !== item.id));
              syncInProgressRef.current = false;
              return;
            }
            
            console.log(`[SYNC_INTEGRIDADE] Integridade de Chave OK. Objeto principal '${objetoId}' verificado no banco.`);
          }
        }

        // 2. Executa a operação de sincronização no banco
        let error = null;
        if (item.action === 'upsert') {
          let syncData: any;
          if (Array.isArray(item.data)) {
            syncData = item.data.map(d => ({ ...d }));
          } else {
            syncData = (item.data !== null && typeof item.data === 'object') ? { ...item.data } : item.data;
          }

          if (Array.isArray(syncData) && syncData.length === 0) {
            console.log(`[SYNC_WORKER] Array vazio recebido para a tabela ${item.table}. Sincronização marcada como realizada.`);
            addSyncLog('success', `Nenhum item para sincronizar na tabela '${item.table}'.`);
            setPendingSyncQueue(prev => prev.filter(i => i.id !== item.id));
            syncInProgressRef.current = false;
            return;
          }
          
          // Função interna para validar sintaxe UUID
          const isValidUUID = (str: any): boolean => {
            if (typeof str !== 'string') return false;
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
          };

          // Função interna para validar e sanitizar especificamente os anúncios/mensagens do mural
          const sanitizeAnnouncement = (ann: any): any => {
            if (!ann || typeof ann !== 'object') {
              throw new Error(`Estrutura de aviso inválida detectada: tipo original ${typeof ann}`);
            }
            if (Array.isArray(ann)) {
              throw new Error("Estrutura de array aninhada inválida dentro de um único registro de aviso.");
            }
            if ('0' in ann) {
              throw new Error("Chave numérica inválida '0' detectada nos dados do aviso (conversão de array corrompida).");
            }

            const cleanAnn: any = {};
            const ALLOWED_COLUMNS = [
              'id', 'title', 'content', 'category', 'date', 'author', 
              'attachment_url', 'created_at', 'updated_at', 'created_by', 'active'
            ];

            let modified = false;
            const removedKeys: string[] = [];

            for (const key of Object.keys(ann)) {
              const lowerKey = key.toLowerCase();
              if (ALLOWED_COLUMNS.includes(lowerKey)) {
                cleanAnn[lowerKey] = ann[key];
              } else {
                removedKeys.push(key);
                modified = true;
              }
            }

            if (modified) {
              console.log(`[SYNC_DIAGNOSTIC] [Mural de Avisos] Chaves desconsideradas pois não existem na tabela SQL 'announcements': ${removedKeys.join(', ')}`);
            }

            // Garantia preventiva de preenchimento para restrições NOT NULL do banco
            if (!cleanAnn.title) cleanAnn.title = 'AVISO DO CONDOMÍNIO';
            if (!cleanAnn.content) cleanAnn.content = 'Sem conteúdo disponível.';
            if (cleanAnn.active === undefined) cleanAnn.active = true;

            // Retorna o objeto limpo pronto para persistência Cloud
            return cleanAnn;
          };

          // Validação robusta preventiva para a tabela de 'announcements'
          if (item.table === 'announcements') {
            try {
              if (Array.isArray(syncData)) {
                syncData = syncData.map(d => sanitizeAnnouncement(d));
              } else {
                syncData = sanitizeAnnouncement(syncData);
              }
              console.log(`[SYNC_DIAGNOSTIC] [Mural de Avisos] Payload validado e higienizado enviado ao Supabase:`, JSON.stringify(syncData, null, 2));
            } catch (validationErr: any) {
              addSyncLog('error', `[SINTAXE_CONFIG] Erro permanente de validação na tabela 'announcements': ${validationErr.message}. Arquivo pulado.`);
              setPendingSyncQueue(prev => prev.filter(i => i.id !== item.id));
              syncInProgressRef.current = false;
              return;
            }
          }

          // Higienização robusta para tabelas de Achados e Perdidos (Mapeamento de criador e tipos de UUID)
          if (item.table === 'achados_perdidos' || item.table === 'achados_perdidos_fotos' || item.table === 'achados_perdidos_historico') {
            const sanitizeAchadosItem = (singleObj: any) => {
              if (!singleObj || typeof singleObj !== 'object') return singleObj;
              const clean = { ...singleObj };
              const creator = clean.created_by || clean.createdBy || clean.criado_por;
              if (creator) {
                clean.created_by = creator;
              }
              
              // Remover propriedades virtuais incompatíveis de todas as tabelas
              delete clean.criado_por;
              delete clean.createdBy;

              // Validar created_by (deve ser um UUID válido no banco, senão removemos/deletamos o campo)
              if (clean.created_by && !isValidUUID(clean.created_by)) {
                delete clean.created_by;
              }

              // Validar usuario_id para a tabela de histórico (deve ser um UUID válido, senão removemos)
              if (item.table === 'achados_perdidos_historico') {
                if (clean.usuario_id && !isValidUUID(clean.usuario_id)) {
                  delete clean.usuario_id;
                }
              }
              return clean;
            };

            if (Array.isArray(syncData)) {
              syncData = syncData.map(d => sanitizeAchadosItem(d));
            } else {
              syncData = sanitizeAchadosItem(syncData);
            }
          }

          // APLICA SANEAMENTO PREVENTIVO PARA TODAS AS TABELAS CONTRA ERROS DE COLUNA PGRST204
          syncData = sanitizePayload(item.table, syncData);

          // LOGS DETALHADOS REVERSOS (Objective 7)
          const columnsInUse = Array.isArray(syncData) 
            ? Object.keys(syncData[0] || {}) 
            : Object.keys(syncData || {});
          console.log("┌────────────────────────────────────────────────────────────");
          console.log(`│ [SYNC_LOGGER] ENVIANDO DADOS PARA O SUPABASE`);
          console.log("├────────────────────────────────────────────────────────────");
          console.log(`│ Tabela:          ${item.table}`);
          console.log(`│ Operação:        ${item.action}`);
          console.log(`│ Colunas em uso:  ${columnsInUse.join(', ')}`);
          console.log(`│ Payload Final:   `, JSON.stringify(syncData, null, 2));
          console.log("└────────────────────────────────────────────────────────────");

          let usedFallbackApi = false;

          if (isDirectChannelOfflineRef.current) {
            console.log(`[SYNC_WORKER] Canal direto marcado como offline. Usando Express API para salvar item na tabela ${item.table}...`);
            const endpoint = getSaveEndpointName(item.table);
            const response = await fetch(`/api/save-${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(syncData)
            });
            if (!response.ok) {
              const errBody = await response.json().catch(() => ({}));
              error = new Error(errBody.error || `Falha ao salvar via API Express: status ${response.status}`);
            } else {
              usedFallbackApi = true;
            }
          } else {
            try {
              if (item.table === 'achados_perdidos' || item.table === 'achados_perdidos_fotos' || item.table === 'achados_perdidos_historico' || item.table === 'audit_logs') {
                const response = await fetch(`/api/save-${item.table.replace(/_/g, '-')}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(syncData)
                });
                if (!response.ok) {
                  const errBody = await response.json().catch(() => ({}));
                  error = new Error(errBody.error || `Failed to save via server API: status ${response.status}`);
                }
              } else {
                const { error: upsertError } = await supabase.from(item.table).upsert(syncData);
                if (upsertError) {
                  throw upsertError;
                }
              }
            } catch (directErr: any) {
              console.warn(`[SYNC_WORKER WARNING] Falha no canal direto para salvar '${item.table}'. Tentando salvar via Express API...`, directErr);
              const endpoint = getSaveEndpointName(item.table);
              try {
                const response = await fetch(`/api/save-${endpoint}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(syncData)
                });
                if (!response.ok) {
                  const errBody = await response.json().catch(() => ({}));
                  error = new Error(errBody.error || `Falha na API Express após falha direta: status ${response.status}`);
                } else {
                  error = null;
                  usedFallbackApi = true;
                }
              } catch (fallbackErr: any) {
                error = new Error(`Falha no canal direto e na API de Fallback Express: ${directErr.message || directErr} // ${fallbackErr.message || fallbackErr}`);
              }
            }
          }
        } else if (item.action === 'delete') {
          if (isDirectChannelOfflineRef.current) {
            console.log(`[SYNC_WORKER] Canal direto marcado como offline. Usando Express API para deletar item na tabela ${item.table}...`);
            const response = await fetch(`/api/delete/${item.table}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: item.data })
            });
            if (!response.ok) {
              const errBody = await response.json().catch(() => ({}));
              error = new Error(errBody.error || `Falha ao deletar via API Express: status ${response.status}`);
            }
          } else {
            try {
              if (item.table === 'achados_perdidos' || item.table === 'achados_perdidos_fotos' || item.table === 'achados_perdidos_historico') {
                const response = await fetch(`/api/delete/${item.table}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: item.data })
                });
                if (!response.ok) {
                  const errBody = await response.json().catch(() => ({}));
                  error = new Error(errBody.error || `Failed to delete via server API: status ${response.status}`);
                }
              } else {
                const { error: deleteError } = await supabase.from(item.table).delete().eq('id', item.data);
                if (deleteError) {
                  throw deleteError;
                }
              }
            } catch (directErr: any) {
              console.warn(`[SYNC_WORKER WARNING] Falha no canal direto para deletar em '${item.table}'. Tentando deletar via Express API...`, directErr);
              try {
                const response = await fetch(`/api/delete/${item.table}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: item.data })
                });
                if (!response.ok) {
                  const errBody = await response.json().catch(() => ({}));
                  error = new Error(errBody.error || `Falha na API Express após falha direta ao deletar: status ${response.status}`);
                } else {
                  error = null;
                }
              } catch (fallbackErr: any) {
                error = new Error(`Falha no canal direto e na API de Fallback Express (Delete): ${directErr.message || directErr} // ${fallbackErr.message || fallbackErr}`);
              }
            }
          }
        }

        if (error) {
          throw error;
        }
        
        // Sincronização Feita com Sucesso
        addSyncLog('success', `Item ${item.id} sincronizado com sucesso na tabela '${item.table}'.`);
        setPendingSyncQueue(prev => prev.filter(i => i.id !== item.id));
      } catch (err: any) {
        hasError = true;
        
        const errMsg = String(err?.message || err?.details || '').toLowerCase();
        const errCode = String(err?.code || '');
        const isSchemaMissing = 
          errCode === '42P01' || 
          errCode === 'PGRST205' || 
          errMsg.includes('relation') || 
          errMsg.includes('schema cache') || 
          errMsg.includes('could not find the table');

        if (isSchemaMissing) {
          console.warn(`[SUPABASE_MIGRATION_PENDING] A tabela '${item.table}' ainda não foi criada no Supabase. O registro foi mantido localmente. Acesse Configurações > Diagnóstico do Banco para executar o script SQL.`);
        } else {
          // Logs detalhados do erro para diagnóstico (Objective 1)
          console.error("┌────────────────────────────────────────────────────────────");
          console.error(`│ [SYNC_ERROR_DETAIL] FALHA NA SINCRONIZAÇÃO`);
          console.error("├────────────────────────────────────────────────────────────");
          console.error(`│ Tabela:          ${item.table}`);
          console.error(`│ Operação:        ${item.action}`);
          console.error(`│ ID do Item:      ${item.id}`);
          console.error(`│ Payload:         `, JSON.stringify(item.data, null, 2));
          console.error(`│ Erro Code:       ${err?.code || 'N/A'}`);
          console.error(`│ Erro Message:    ${err?.message || 'N/A'}`);
          console.error(`│ Erro Details:    ${err?.details || 'N/A'}`);
          console.error(`│ Erro Hint:       ${err?.hint || 'N/A'}`);
          console.error("└────────────────────────────────────────────────────────────");
        }
        
        const errStatus = Number(err?.status || err?.statusCode || 0);
        
        const isFkViolation = errCode === '23503' || errMsg.includes('foreign key') || errMsg.includes('violates foreign key constraint');
        
        // Detecção ultra robusta de erros de permissão, RLS ou sintaxe inválida (Permanentes)
        const isPolicyOrAuthViolation = 
          errCode === '42501' || 
          errStatus === 401 || 
          errStatus === 403 || 
          errStatus === 400 ||
          errMsg.includes('violates row-level security policy') ||
          errMsg.includes('policy') ||
          errMsg.includes('permission denied') ||
          errMsg.includes('unauthorized') ||
          errMsg.includes('forbidden') ||
          errMsg.includes('invalid input format') ||
          errMsg.includes('not found');

        if (isSchemaMissing) {
          // Trata tabelas ainda não criadas no Supabase de forma amigável
          addSyncLog('warning', `[MIGRAÇÃO PENDENTE] Tabela '${item.table}' não existe no Supabase. O registro foi mantido localmente. Acesse Configurações > Diagnóstico do Banco para copiar e rodar o script SQL.`);
          setPendingSyncQueue(prev => prev.filter(i => i.id !== item.id));
        } else if (isFkViolation) {
          // Trata falhas de Constraint FK de forma segura para evitar filas travadas infinitamente
          addSyncLog('error', `[CONSTR_VIOLATION] Sincronização de '${item.id}' quebrou restrição de chave: ${err?.message || errMsg}. Arquivando registro órfão.`);
          setPendingSyncQueue(prev => prev.filter(i => i.id !== item.id));
        } else if (isPolicyOrAuthViolation) {
          // Trata violações definitivas de segurança e políticas RLS
          addSyncLog('error', `[RLS/AUTH_VIOLATION] Sincronização de '${item.id}' na tabela '${item.table}' falhou de forma permanente por RLS/Permissão (${errCode || errStatus}): ${err?.message || errMsg}. Descartando da fila.`);
          setPendingSyncQueue(prev => prev.filter(i => i.id !== item.id));
        } else {
          // Erros de conexão, rede offline (transientes)
          const isTransient = !err.status || err.status >= 500 || errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('timeout') || errMsg.includes('offline');
          const currentRetries = item.retries || 0;
          
          if (isTransient && currentRetries < 5) {
            addSyncLog('warning', `Falha temporária ao sincronizar item ${item.id} (${item.table}). Tentativa ${currentRetries + 1}/5. Retentando em breve...`);
            setPendingSyncQueue(prev => prev.map(i => i.id === item.id ? { ...i, retries: currentRetries + 1 } : i));
          } else {
            addSyncLog('error', `Falha crítica e definitiva na tabela '${item.table}' (id: ${item.id}): ${err?.message || errMsg}. Descartando da fila.`);
            setPendingSyncQueue(prev => prev.filter(i => i.id !== item.id));
          }
        }
      } finally {
        const timeoutDelay = hasError ? 2000 : 0;
        setTimeout(() => {
          syncInProgressRef.current = false;
          if (isMountedRef.current && pendingSyncQueueRef.current.length > 0) {
            runSync();
          }
        }, timeoutDelay);
      }
    }

    runSync();

    // Controle de tamanho máximo de seguranca local
    if (pendingSyncQueue.length > 100) {
        console.warn("[SYNC_DIAGNOSTIC] Fila de sincronização excedeu limite máximo. Reduzindo fila.");
        setPendingSyncQueue(prev => prev.slice(-100));
    }

    return () => {
      active = false;
    };
  }, [pendingSyncQueue]);




  // Prevent loss of pending changes when closing or re-loading
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingSyncQueue.length > 0) {
        event.preventDefault();
        event.returnValue = 'Existem dados pendentes de sincronização com o banco de dados. Tem certeza que deseja fechar ou atualizar?';
        return event.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingSyncQueue]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [configStatus, setConfigStatus] = useState<{ isValid: boolean; errors: string[] } | null>(null);

  // Core local states
  const [residents, setResidents] = useSupabaseSync<Resident>(residentsRepository);
  const [encomendas, setEncomendas] = useSupabaseSync<Encomenda>(encomendasRepository);
  const [visitors, setVisitors] = useSupabaseSync<Visitor>(visitorsRepository);
  const [bookings, setBookings] = useSupabaseSync<Booking>(bookingsRepository);
  const [commonAreas, setCommonAreas] = useSupabaseSync<CommonArea>(commonAreasRepository);
  const [announcements, setAnnouncements] = useSupabaseSync<Announcement>(announcementsRepository);
  const [incidents, setIncidents] = useSupabaseSync<Incident>(incidentsRepository);
  const [achadosPerdidos, setAchadosPerdidos] = useSupabaseSync<AchadosPerdidos>(achadosPerdidosRepository);
  const [achadosPerdidosFotos, setAchadosPerdidosFotos] = useDexiePersistence<AchadosPerdidosFoto[]>('achadosPerdidosFotos', []);
  const [achadosPerdidosHistorico, setAchadosPerdidosHistorico] = useDexiePersistence<AchadosPerdidosHistorico[]>('achadosPerdidosHistorico', []);

  // Admin credentials and settings states
  const [adminPassword, setAdminPassword] = useLocalStoragePersistence<string>('admin_password', 'admin');
  const [operatorName, setOperatorName] = useLocalStoragePersistence<string>('operatorName', 'Op. Ricardo Silva');
  const [portName, setPortName] = useLocalStoragePersistence<string>('portName', 'Portaria Norte');
  const [operatorAvatarUrl, setOperatorAvatarUrl] = useLocalStoragePersistence<string>('operatorAvatarUrl', '');

  // Current logged in user profile session
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; unit?: string; role: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador' }>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : {
      id: 'admin',
      name: 'Op. Ricardo Silva',
      role: 'Administrador'
    };
  });

  const [isPanelLocked, setIsPanelLocked] = useState<boolean>(() => localStorage.getItem('isUnlocked') !== 'true');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isThemeDrawerOpen, setIsThemeDrawerOpen] = useState<boolean>(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [currentModalAnnouncement, setCurrentModalAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isThemeDrawerOpen) setIsThemeDrawerOpen(false);
        if (isQRScannerOpen) setIsQRScannerOpen(false);
        if (isProfileModalOpen) setIsProfileModalOpen(false);
        if (currentModalAnnouncement) setCurrentModalAnnouncement(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, isThemeDrawerOpen, isQRScannerOpen, isProfileModalOpen, currentModalAnnouncement]);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('theme_settings');
    if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_THEME_SETTINGS;
  });
  const [loginCustomization, setLoginCustomization] = useDexiePersistence<LoginCustomization>('loginCustomization', DEFAULT_LOGIN_CUSTOMIZATION);
  const [incidentCategories, setIncidentCategories] = useDexiePersistence<string[]>('incidentCategories', [
    'Barulho', 
    'Vazamento', 
    'Infraestrutura', 
    'Segurança', 
    'Manutenção',
    'Outro'
  ]);
  const [auditLogs, setAuditLogs] = useDexiePersistence<AuditLog[]>('auditLogs', []);
  const [retentionDays, setRetentionDays] = useLocalStoragePersistence<number>('retentionDays', 30);




  // Computed Active Lists for all modules (excludes any soft deleted entries)
  const activeResidents = React.useMemo(() => residents.filter(r => !r.deleted_at), [residents]);
  const activeVisitors = React.useMemo(() => visitors.filter(v => !v.deleted_at), [visitors]);
  const activeBookings = React.useMemo(() => bookings.filter(b => !b.deleted_at), [bookings]);
  const activeCommonAreas = React.useMemo(() => commonAreas.filter(c => !c.deleted_at), [commonAreas]);
  const activeAnnouncements = React.useMemo(() => announcements.filter(a => !a.deleted_at), [announcements]);
  const activeIncidents = React.useMemo(() => incidents.filter(i => !i.deleted_at), [incidents]);
  const activeEncomendas = React.useMemo(() => encomendas.filter(e => !e?.deleted_at), [encomendas]);
  const activeAchadosPerdidos = React.useMemo(() => achadosPerdidos.filter(a => !a.deleted_at), [achadosPerdidos]);

  // Cancela / Portaria gate trigger state
  const [cancelaReleaseActive, setCancelaReleaseActive] = useState<boolean>(false);
  const [cancelaReleaseName, setCancelaReleaseName] = useState<string>('');
  const [cancelaReleasePlate, setCancelaReleasePlate] = useState<string | null>(null);
  const [cancelaReleaseType, setCancelaReleaseType] = useState<'cancela' | 'visitor' | 'package'>('cancela');

  // Announcement popup state
  const [viewedAnnouncements, setViewedAnnouncements] = useLocalStoragePersistence<string[]>('viewed_announcements', []);

  useEffect(() => {
    if (currentUser.role === 'Morador' && activeAnnouncements.length > 0) {
      const unviewed = activeAnnouncements.filter(a => !viewedAnnouncements.includes(a.id));
      if (unviewed.length > 0 && !currentModalAnnouncement) {
        setCurrentModalAnnouncement(unviewed[0]);
      }
    }
  }, [activeAnnouncements, viewedAnnouncements, currentUser.role, currentModalAnnouncement]);

  const handleConfirmAnnouncement = () => {
    if (currentModalAnnouncement) {
      setViewedAnnouncements(prev => [...prev, currentModalAnnouncement.id]);
      setCurrentModalAnnouncement(null);
    }
  };

  const triggerCancelaRelease = (name: string, plate?: string, type: 'cancela' | 'visitor' | 'package' = 'cancela') => {
    setCancelaReleaseName(name);
    setCancelaReleasePlate(plate || null);
    setCancelaReleaseType(type);
    setCancelaReleaseActive(true);
    setTimeout(() => {
      setCancelaReleaseActive(false);
      setCancelaReleasePlate(null);
    }, 5000);
  };

  // Central Audit Logger with background DB synchronization and automatic retention trimming
  const addAuditLog = async (
    action: AuditLog['action'],
    module: AuditLog['module'],
    recordId?: string,
    oldData?: any,
    newData?: any,
    errorMessage?: string,
    stackTrace?: string
  ) => {
    let ipAddress = '127.0.0.1';
    try {
      const res = await Promise.race([
        fetch('https://api.ipify.org?format=json').then(r => r.json()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1205))
      ]);
      if (res && (res as any).ip) {
        ipAddress = (res as any).ip;
      }
    } catch (_) {
      // Gracefully defaults to loopback IP
    }

    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      user_id: currentUser ? currentUser.id : 'system',
      user_name: currentUser ? currentUser.name : 'Sistema',
      action,
      module,
      record_id: recordId,
      old_data: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
      new_data: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
      ip_address: ipAddress,
      user_agent: navigator.userAgent,
      error_message: errorMessage || undefined,
      stack_trace: stackTrace
    };

    setAuditLogs(prev => {
      const threshold = retentionDays !== 9999 ? Date.now() - (retentionDays * 24 * 60 * 60 * 1000) : 0;
      const filtered = threshold > 0 
        ? prev.filter(log => new Date(log.created_at).getTime() >= threshold)
        : prev;
      return [newLog, ...filtered].slice(0, 1000);
    });

    // Mirror write to Supabase if configured, otherwise preserved in local state sync queue
    addToSyncQueue('audit_logs', 'upsert', {
      id: newLog.id,
      created_at: newLog.created_at,
      user_id: newLog.user_id,
      user_name: newLog.user_name,
      action: newLog.action,
      module: newLog.module,
      record_id: newLog.record_id,
      old_data: newLog.old_data,
      new_data: newLog.new_data,
      ip_address: newLog.ip_address,
      user_agent: newLog.user_agent,
      error_message: newLog.error_message,
      stack_trace: newLog.stack_trace
    });

    // Prune old logs in backend after inserting new log
    pruneOldAuditLogs().catch(console.error);
  };

  // Auto-track and log all JavaScript runtime exceptions, Supabase failures, and unhandled promise rejections
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      addAuditLog(
        'ERROR', 
        'Monitoramento de Erros', 
        undefined, 
        undefined, 
        undefined, 
        event.message, 
        event.error?.stack || 'Erro na execução interna do web app'
      );
    };

    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      addAuditLog(
        'ERROR', 
        'Monitoramento de Erros', 
        undefined, 
        undefined, 
        undefined, 
        `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`, 
        event.reason?.stack || 'Promessa rejeitada sem tratamento (Promise Rejection)'
      );
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalRejection);
    };
  }, [currentUser]);

  const handleScanSuccess = async (decodedText: string, confirmStep?: boolean, extraData?: any): Promise<{ success: boolean; message: string; type: 'visitor' | 'package' | 'resident' | 'unknown'; data?: any }> => {
    const textClean = decodedText.trim();
    
    // 1. Check if scanned QR matches an Encomenda qrCodeValue or tracking code
    const matchedEnc = encomendas.find(enc => {
       const encVal = (enc.qrCodeValue || '').trim().toUpperCase();
       const scanVal = textClean.toUpperCase();
       const trackingVal = (enc.codigoRastreio || '').trim().toUpperCase();
       return encVal === scanVal || scanVal.includes(encVal) || (trackingVal !== '' && scanVal.includes(trackingVal));
    });

    if (matchedEnc) {
      if (matchedEnc.status === 'Entregue') {
         return {
           success: false,
           message: `A encomenda ${matchedEnc.codigoRastreio} já foi retirada anteriormente por ${matchedEnc.quemRetirou || 'morador'} em ${matchedEnc.dataRetirada ? new Date(matchedEnc.dataRetirada).toLocaleString('pt-BR') : ''}.`,
           type: 'package'
         };
      }

      if (!confirmStep) {
        // Stage 1 pre-confirmation
        return {
          success: true,
          message: 'Encomenda identificada.',
          type: 'package',
          data: matchedEnc
        };
      }

      // Mark as delivered (Stage 2)
      const details = {
        quemRetirou: extraData?.receiverName || 'Controlador de Acesso Portaria Express',
        responsavelEntrega: operatorName,
        dataRetirada: new Date().toISOString()
      };
      
      const updatedList = encomendas.map(e => e.id === matchedEnc.id ? {
        ...e,
        status: 'Entregue' as const,
        ...details
      } : e);
      
      await saveEncomendas(updatedList);
      triggerCancelaRelease(`Portaria Express - Entrega: ${matchedEnc.codigoRastreio} (${matchedEnc.torre} - Apt ${matchedEnc.apartamento})`);
      setToast({ message: `Encomenda correspondente ao Código ${matchedEnc.codigoRastreio} foi retirada com sucesso!`, type: 'success' });
      return {
        success: true,
        message: `Encomenda de ${matchedEnc.moradorNome} (${matchedEnc.torre} - Apt ${matchedEnc.apartamento}) liberada! Código ${matchedEnc.codigoRastreio}.`,
        type: 'package',
        data: matchedEnc
      };
    }

    // 2. Check if scanned QR matches a Visitor Invitation
    const matchedVisitor = visitors.find(visitor => {
      const scanLower = textClean.trim().toLowerCase();
      const visitorIdLower = visitor.id.toLowerCase();
      const codeMatches = visitor.exitCode && scanLower === visitor.exitCode.toLowerCase();
      return scanLower === visitorIdLower || 
             scanLower.includes(`express-${visitorIdLower}`) || 
             scanLower.includes(`express_${visitorIdLower}`) ||
             scanLower.includes(visitorIdLower) ||
             codeMatches;
    });

    if (matchedVisitor) {
       if (matchedVisitor.status === 'Dentro') {
          return {
            success: false,
            message: `O visitante ${matchedVisitor.name} já tem status ativo como 'Dentro' do condomínio.`,
            type: 'visitor'
          };
       }

       if (matchedVisitor.expirationTime && new Date() > new Date(matchedVisitor.expirationTime)) {
          return {
            success: false,
            message: `ACESSO NEGADO: O passe de acesso rápido de ${matchedVisitor.name} EXPIROU em ${new Date(matchedVisitor.expirationTime).toLocaleString('pt-BR')}.`,
            type: 'visitor'
          };
       }

       if (!confirmStep) {
         // Stage 1 pre-confirmation
         return {
           success: true,
           message: 'Visitante identificado.',
           type: 'visitor',
           data: matchedVisitor
         };
       }

       // Update status to "Dentro" (Stage 2)
       const updatedList = visitors.map(v => v.id === matchedVisitor.id ? {
         ...v,
         status: 'Dentro' as const,
         entryTime: new Date().toISOString()
       } : v);

       await saveVisitors(updatedList);
       
       // Trigger gate/cancela barrier release
       triggerCancelaRelease(`Portaria Express: Visitante ${matchedVisitor.name}`, matchedVisitor.vehiclePlate, 'visitor');
       setToast({ message: `Acesso Express Liberado para: ${matchedVisitor.name}!`, type: 'success' });
       return {
         success: true,
         message: `Convite de Visitante Válido! Acesso Autorizado para: ${matchedVisitor.name} (Destino: Unidade ${matchedVisitor.unitToVisit} - Anfitrião: ${matchedVisitor.hostName}).`,
         type: 'visitor',
         data: matchedVisitor
       };
    }

    // 3. Check if scanned QR matches a Resident
    const matchedResident = residents.find(res => {
      const scanVal = textClean.trim().toUpperCase();
      return (res.qrCodeValue && res.qrCodeValue.trim().toUpperCase() === scanVal) || 
             (res.id.toLowerCase() === textClean.trim().toLowerCase());
    });

    if (matchedResident) {
      if (!confirmStep) {
        // Stage 1 pre-confirmation
        return {
          success: true,
          message: 'Morador identificado.',
          type: 'resident',
          data: matchedResident
        };
      }

      // Access logic
      triggerCancelaRelease(`ACESSO LIBERADO: ${matchedResident.name} (${matchedResident.unit})`, undefined, 'visitor');
      setToast({ message: `ACESSO LIBERADO: ${matchedResident.name}!`, type: 'success' });
      return {
        success: true,
        message: `ACESSO LIBERADO: ${matchedResident.name} (${matchedResident.unit})`,
        type: 'resident',
        data: matchedResident
      };
    }

    // 4. Unrecognized QRCode code
    return {
      success: false,
      message: `Código escaneado não cadastrado no sistema de Segurança Integrada: "${textClean}". Certifique-se de escanear um QRCode válido.`,
      type: 'unknown'
    };
  };

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth persistence listener
  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Auth change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update currentUser based on session
  useEffect(() => {
      if (session?.user) {
          // In a real app we'd fetch profile from a users table
          setCurrentUser({
              id: session.user.id,
              name: session.user.user_metadata.name || 'Usuário',
              role: session.user.user_metadata.role || 'Morador'
          });
      }
  }, [session]);

  // Online status of residents (simulating real-time connections)
  const [onlineResidentIds, setOnlineResidentIds] = useState<string[]>(['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']);
  const [isMyPackagesOpen, setIsMyPackagesOpen] = useState<boolean>(false);
  const [activePackageToast, setActivePackageToast] = useState<Encomenda | null>(null);

  // Synchronize currentUser with online resident list
  useEffect(() => {
    if (currentUser && currentUser.role === 'Morador' && currentUser.id !== 'admin') {
      setOnlineResidentIds(prev => {
        if (!prev.includes(currentUser.id)) {
          return [...prev, currentUser.id];
        }
        return prev;
      });
    }
  }, [currentUser]);



  const handleToggleResidentOnline = (id: string) => {
    setOnlineResidentIds(prev => {
      if (prev.includes(id)) {
        if (currentUser.role === 'Morador' && currentUser.id === id) {
          alert('Este morador está atualmente conectado e ativo neste terminal.');
          return prev;
        }
        return prev.filter(rId => rId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Detailed logging and automatic retries before falling back to local cache/mock (Tasks 9, 10 & 11)
  const queryWithRetry = async <T,>(fn: () => Promise<T>, retries = 3, baseDelay = 600, context = ''): Promise<T> => {
    let lastError: any = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = baseDelay * (attempt - 1);
          console.log(`[SYNCHRONIZER RETRY] Tentando recarregar dados de '${context}' no retry ${attempt}/${retries} (Aguardando ${delay}ms)...`);
          addSyncLog('warning', `Tentativa de re-conexão para '${context}' [Attempt ${attempt}/${retries}] após falha anterior...`);
          await new Promise(r => setTimeout(r, delay));
        }
        return await fn();
      } catch (err: any) {
        lastError = err;
        console.warn(`[SYNCHRONIZER RETRY_WARN] Falha na tentativa ${attempt}/${retries} para '${context}':`, err.message || err);
      }
    }
    throw lastError;
  };

  // Resilient query wrapper with full fallbacks and automatic retries (Tasks 9 & 10)
  const resilientQuery = async (table: string): Promise<any[]> => {
    try {
      if (isDirectChannelOfflineRef.current) {
        console.log(`[SYNCHRONIZER] Canal direto marcado como offline. Buscando dados de '${table}' via Express API Proxy...`);
        return await fetchFallbackProxy(table);
      }

      addSyncLog('warning', `Buscando dados de '${table}' via Supabase Client (Direct Connection)...`);
      
      const data = await queryWithRetry(async () => {
        const { data: qData, error } = await supabase.from(table).select('*');
        if (error) {
          throw new Error(`[Supabase Code ${error.code || 'S/C'}] ${error.message}`);
        }
        return qData || [];
      }, 2, 300, `Supabase Direct: ${table}`);
      
      // If direct access returned empty, check via proxy to avoid silent RLS blocking
      if (data && data.length === 0 && !verifiedTablesRef.current[table]) {
        console.log(`[SYNCHRONIZER] Tabela direta '${table}' retornou 0 resultados. Consultando Express API Proxy para checar se RLS bloqueia canais anônimos...`);
        const proxyData = await fetchFallbackProxy(table);
        verifiedTablesRef.current[table] = true;
        if (proxyData && proxyData.length > 0) {
          addSyncLog('warning', `Possível Row-Level-Security (RLS) restritivo ou omitido na API direta para '${table}'. Usando dados seguros resgatados via Express Proxy (Service Role Bypass).`);
          return proxyData;
        }
      }
      
      addSyncLog('success', `Tabela '${table}' carregada com sucesso via canal direto (${data ? data.length : 0} registros).`);
      return data || [];
    } catch (err: any) {
      isDirectChannelOfflineRef.current = true;
      console.warn(`[SYNCHRONIZER WARNING] Falha total no canal direto para '${table}': ${err.message || err}. Tentando fallback em tempo de execução via Express Proxy...`);
      addSyncLog('warning', `Falha de rede direta para '${table}': ${err.message || err}. Redirecionando para API Proxy do servidor express.`);
      return await fetchFallbackProxy(table);
    }
  };

  const fetchFallbackProxy = async (table: string): Promise<any[]> => {
    try {
      console.log(`[SYNCHRONIZER] Solicitando dados de '${table}' ao Express API Proxy...`);
      
      const json = await queryWithRetry(async () => {
        const resBytes = await fetch(`/api/data/${table}`);
        if (!resBytes.ok) {
          throw new Error(`Servidor Express retornou status HTTP ${resBytes.status}`);
        }
        const parsedJson = await resBytes.json();
        if (!parsedJson.success) {
          throw new Error(parsedJson.error || 'Erro reportado pelo Express no payload');
        }
        return parsedJson;
      }, 3, 600, `Express Proxy: ${table}`);

      if (json.success && Array.isArray(json.data)) {
        if (json.localOnly) {
          addSyncLog('warning', `Tabela '${table}' em simulação local (Banco de Dados não inicializado no Supabase). Buscando cache local...`);
          const dexieTable = getTableForStore(table);
          if (dexieTable) {
            try {
              const items = await dexieTable.toArray();
              console.log(`[SYNCHRONIZER OFFLINE] Cache offline do Dexie lido com sucesso para '${table}' (Simulação: ${items.length} itens recuperados).`);
              return items;
            } catch (pe) {
              console.error(`[SYNCHRONIZER OFFLINE] Falha ao ler cache offline do Dexie para '${table}'`, pe);
            }
          }
          const cached = localStorage.getItem(table);
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (pe) {
              // ignore
            }
          }
          return json.data;
        }
        addSyncLog('success', `Tabela '${table}' carregada com sucesso do Express API Proxy (Service Role).`);
        return json.data;
      }
      throw new Error('Formato de dados recebidos inválido no payload');
    } catch (proxyErr: any) {
      console.error(`[SYNCHRONIZER CRITICAL] Falha irremediável em '${table}' (Direto & Proxy falharam):`, proxyErr.message || proxyErr);
      addSyncLog('error', `Falha irremediável ao carregar '${table}' (Direto & Proxy falharam): ${proxyErr.message || proxyErr}. Buscando cache offline local...`);
      
      const dexieTable = getTableForStore(table);
      if (dexieTable) {
        try {
          const items = await dexieTable.toArray();
          console.log(`[SYNCHRONIZER OFFLINE] Cache offline do Dexie (IndexedDB) lido com sucesso para '${table}' (${items.length} itens recuperados).`);
          return items;
        } catch (pe) {
          console.error(`[SYNCHRONIZER OFFLINE] Falha ao ler cache offline do Dexie para '${table}'`, pe);
        }
      }
      
      const cached = localStorage.getItem(table);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          console.log(`[SYNCHRONIZER OFFLINE] Cache offline (localStorage Fallback) lido com sucesso para '${table}' (${parsedCache.length} itens recuperados).`);
          return parsedCache;
        } catch (pe) {
          console.error(`[SYNCHRONIZER OFFLINE] Falha ao decodificar JSON do cache offline do localStorage de '${table}'`);
          return [];
        }
      }
      return [];
    }
  };

  // Realtime subscription setup
  const [realtimeActive, setRealtimeActive] = useState<boolean>(false);
  const realtimeActiveRef = useRef<boolean>(false);
  useEffect(() => {
    realtimeActiveRef.current = realtimeActive;
  }, [realtimeActive]);

  useEffect(() => {
    if (typeof supabase.channel !== 'function') {
      console.warn("[SYNC_DIAGNOSTIC] Supabase Client em uso não suporta canais de Tempo Real (Mock Client). Usando Polling de 5 segundos.");
      setRealtimeActive(false);
      return;
    }

    const handleRealtimeUpdate = (payload: any) => {
      console.log(`[REALTIME_SYNC_DEBUG] Payload recebido:`, payload);
      const table = payload.table;
      const eventType = payload.eventType;
      console.log(`[REALTIME_SYNC] Event: ${eventType} in Table: ${table}`, payload);

      if (table === 'app_config') {
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const row = payload.new;
          if (row.key === 'theme_settings') {
            try {
              const rawValue = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
              const parsed = JSON.parse(rawValue);
              if (parsed && typeof parsed === 'object') {
                const settingsWithId = { ...parsed, id: 'active' };
                setThemeSettings(prev => JSON.stringify(prev) !== JSON.stringify(settingsWithId) ? settingsWithId : prev);
              }
            } catch (e) {
              console.error("Erro parsing de realtime theme_settings", e);
            }
          } else if (row.key === 'operator_settings') {
            try {
              const rawValue = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
              const parsed = JSON.parse(rawValue);
              if (parsed && typeof parsed === 'object') {
                if (parsed.operatorName) {
                  setOperatorName(prev => prev !== parsed.operatorName ? parsed.operatorName : prev);
                  setCurrentUser(prev => {
                    if (prev && (prev.role === 'Administrador' || prev.id === 'admin')) {
                      if (prev.name !== parsed.operatorName) {
                        return { ...prev, name: parsed.operatorName };
                      }
                    }
                    return prev;
                  });
                }
                if (parsed.portName) setPortName(prev => prev !== parsed.portName ? parsed.portName : prev);
                if (parsed.operatorAvatarUrl !== undefined) setOperatorAvatarUrl(prev => prev !== parsed.operatorAvatarUrl ? parsed.operatorAvatarUrl : prev);
              }
            } catch (e) {
              console.error("Erro parsing de realtime operator_settings", e);
            }
          } else if (row.key === 'admin_password') {
            const rawVal = row.value;
            let cleanPass = rawVal;
            if (typeof rawVal === 'string') {
              try {
                cleanPass = JSON.parse(rawVal);
              } catch (e) {
                cleanPass = rawVal;
              }
            }
            setAdminPassword(prev => prev !== cleanPass ? cleanPass : prev);
          }
        }
        return;
      }

       const tableStateMap: Record<string, {
        setter: React.Dispatch<React.SetStateAction<any[]>>,
        label: string,
        keepSnakeCase?: boolean
      }> = {
        residents: { setter: setResidents, label: 'Moradores' },
        visitors: { setter: setVisitors, label: 'Visitantes' },
        bookings: { setter: setBookings, label: 'Reservas' },
        announcements: { setter: setAnnouncements, label: 'Avisos' },
        incidents: { setter: setIncidents, label: 'Ocorrências' },
        encomendas: { setter: setEncomendas, label: 'Encomendas' },
        common_areas: { setter: setCommonAreas, label: 'Áreas Comuns' },
        achados_perdidos: { setter: setAchadosPerdidos, label: 'Achados e Perdidos', keepSnakeCase: true },
        achados_perdidos_fotos: { setter: setAchadosPerdidosFotos, label: 'Fotos de Achados e Perdidos', keepSnakeCase: true },
        achados_perdidos_historico: { setter: setAchadosPerdidosHistorico, label: 'Histórico de Achados e Perdidos', keepSnakeCase: true },
        audit_logs: { setter: setAuditLogs, label: 'Logs de Auditoria' }
      };

      const config = tableStateMap[table];
      if (!config) {
          console.log(`[REALTIME_SYNC] Tabela '${table}' não mapeada para atualização de estado automática.`);
          return;
      }

      const { setter, label } = config;

      if (eventType === 'INSERT') {
        console.log(`[REALTIME_SYNC_DEBUG] Evento INSERT recebido para a tabela ${table}:`, payload);
        const record = payload.new;
        if (!record) return;
        const newItem = config.keepSnakeCase ? record : toCamelCase(record, ['deleted_at', 'deleted_by', 'deletion_reason']);
        console.log(`[REALTIME_SYNC_DEBUG] Keys of converted record:`, Object.keys(newItem));
        setter(prev => {
          const exists = prev.some(item => item.id === newItem.id);
          if (exists) {
            return prev.map(item => item.id === newItem.id ? { ...item, ...newItem } : item);
          }
          addSyncLog('success', `Novo(a) ${label} recebido(a) via Tempo Real e sincronizado(a).`);
          return [newItem, ...prev];
        });
      } else if (eventType === 'UPDATE') {
        const record = payload.new;
        if (!record) return;
        const updatedItem = config.keepSnakeCase ? record : toCamelCase(record, ['deleted_at', 'deleted_by', 'deletion_reason']);
        setter(prev => {
          const exists = prev.some(item => item.id === updatedItem.id);
          if (!exists) {
            return [updatedItem, ...prev];
          }
          return prev.map(item => item.id === updatedItem.id ? { ...item, ...updatedItem } : item);
        });
      } else if (eventType === 'DELETE') {
        const oldRecord = payload.old;
        const deletedId = oldRecord?.id;
        if (deletedId) {
          setter(prev => {
            const exists = prev.some(item => item.id === deletedId);
            if (exists) {
              addSyncLog('warning', `${label} removido(a) via Tempo Real.`);
            }
            return prev.filter(item => item.id !== deletedId);
          });
        }
      }
    };

    let active = true;

    console.log("[SYNC_DIAGNOSTIC] Conectando canal de Tempo Real para o banco de dados public...");
    addSyncLog('success', 'Iniciando conexão de canais Realtime do Supabase...');

    const cleanupRealtime = () => {
      active = false;
      if (realtimeRef.current.reconnectTimer) clearTimeout(realtimeRef.current.reconnectTimer);
      if (realtimeRef.current.channel) {
        console.log("[SYNC_DIAGNOSTIC] Limpando canal de Tempo Real...");
        supabase.removeChannel(realtimeRef.current.channel);
        realtimeRef.current.channel = null;
      }
      
      // Safety cleanup: remove any potentially orphaned channels
      const channels = supabase.getChannels();
      for (const c of channels) {
          supabase.removeChannel(c);
      }
    };

    const connectChannel = async () => {
      cleanupRealtime();
      active = true;

      // 1. Create a unique channel name to prevent collision
      realtimeRef.current.channel = supabase.channel(`public-db-changes-${crypto.randomUUID()}`);
      
      // 2. Set up callbacks
      realtimeRef.current.channel.on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload: any) => {
            if (active) handleRealtimeUpdate(payload);
          }
      );

      // 3. Subscribe
      await realtimeRef.current.channel.subscribe((status: string) => {
        if (!active) return;
        console.log(`[REALTIME_CONECTION_STATUS] Canal de sincronização do banco public: ${status}`);
        if (status === 'SUBSCRIBED') {
          setRealtimeActive(true);
          addSyncLog('success', 'Inscrição de canais Realtime ativa e conectada.');
        } else {
          setRealtimeActive(false);
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[REALTIME_WARN] Canal de Tempo Real desconectado, tentando reconectar em 5s: ${status}`);
            if (active) realtimeRef.current.reconnectTimer = setTimeout(connectChannel, 5000);
          }
        }
      });
    };

    connectChannel();

    return () => {
      cleanupRealtime();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial Seed from API or Fallbacks
  useEffect(() => {
    async function loadData() {
        if (pendingSyncQueueRef.current.length > 0 || (Date.now() - lastWriteTimeRef.current < 8000)) {
            console.log("[SYNC_DIAGNOSTIC] Sincronização periódica postergada para preservar modificações locais ativas.", {
                queueLength: pendingSyncQueueRef.current.length,
                timeSinceLastWriteMs: Date.now() - lastWriteTimeRef.current
            });
            return;
        }
        try {
            console.log(`[SYNC_DIAGNOSTIC] Canal de Sincronização e Resiliência iniciado: ${new Date().toLocaleTimeString('pt-BR')}`);

            const [
                resData,
                visData,
                bookData,
                annData,
                incData,
                encData,
                caData,
                confData
            ] = await Promise.all([
                resilientQuery('residents'),
                resilientQuery('visitors'),
                resilientQuery('bookings'),
                resilientQuery('announcements'),
                resilientQuery('incidents'),
                resilientQuery('encomendas'),
                resilientQuery('common_areas'),
                resilientQuery('app_config'),
            ]);

            // Resilient loading of Achados e Perdidos entities
            try {
                const apData = await resilientQuery('achados_perdidos');
                if (apData) {
                    const newItems = apData;
                    setAchadosPerdidos(prev => JSON.stringify(prev) !== JSON.stringify(newItems) ? newItems : prev);
                }
            } catch (err) {
                console.warn("[SYNC] Tabela 'achados_perdidos' indisponível localmente ou no Supabase, mantendo cache local.", err);
            }

            try {
                const apFotosData = await resilientQuery('achados_perdidos_fotos');
                if (apFotosData) {
                    const newFotos = apFotosData;
                    setAchadosPerdidosFotos(prev => JSON.stringify(prev) !== JSON.stringify(newFotos) ? newFotos : prev);
                }
            } catch (err) {
                console.warn("[SYNC] Tabela 'achados_perdidos_fotos' indisponível.", err);
            }

            try {
                const apHistData = await resilientQuery('achados_perdidos_historico');
                if (apHistData) {
                    const newHist = apHistData;
                    setAchadosPerdidosHistorico(prev => JSON.stringify(prev) !== JSON.stringify(newHist) ? newHist : prev);
                }
            } catch (err) {
                console.warn("[SYNC] Tabela 'achados_perdidos_historico' indisponível.", err);
            }

            try {
                const loginCustomData = await resilientQuery('login_customization');
                if (loginCustomData && loginCustomData.length > 0) {
                    const activeConfig = loginCustomData[0] as unknown as LoginCustomization;
                    setLoginCustomization(prev => JSON.stringify(prev) !== JSON.stringify(activeConfig) ? activeConfig : prev);
                }
            } catch (err) {
                console.warn("[SYNC] Tabela 'login_customization' indisponível localmente ou no Supabase, mantendo local.", err);
            }

            // 1. Residents
            if (resData) {
                const newResidents = toCamelCase(resData).map(r => ({
                  ...r,
                  qrCodeValue: r.qrCodeValue || crypto.randomUUID(),
                  createdAt: r.createdAt || new Date().toISOString().split('T')[0]
                }));
                setResidents(prev => JSON.stringify(prev) !== JSON.stringify(newResidents) ? newResidents : prev);
            }

            // 2. Visitors
            if (visData) {
                const newVisitors = toCamelCase(visData);
                setVisitors(prev => JSON.stringify(prev) !== JSON.stringify(newVisitors) ? newVisitors : prev);
            }

            // 3. Bookings
            if (bookData) {
                const newBookings = toCamelCase(bookData);
                setBookings(prev => JSON.stringify(prev) !== JSON.stringify(newBookings) ? newBookings : prev);
            }

            // 4. Announcements
            if (annData) {
                const newAnnouncements = toCamelCase(annData);
                setAnnouncements(prev => JSON.stringify(prev) !== JSON.stringify(newAnnouncements) ? newAnnouncements : prev);
            }

            // 5. Incidents
            if (incData) {
                const newIncidents = toCamelCase(incData).map((inc: any) => {
                  return {
                    ...inc
                  };
                });
                setIncidents(prev => JSON.stringify(prev) !== JSON.stringify(newIncidents) ? newIncidents : prev);
            }

            // 6. Encomendas
            if (encData) {
                const newEncomendas = toCamelCase(encData);
                setEncomendas(prev => JSON.stringify(prev) !== JSON.stringify(newEncomendas) ? newEncomendas : prev);
            }

            // 7. Common areas
            if (caData) {
                const newCommonAreas = toCamelCase(caData);
                setCommonAreas(prev => JSON.stringify(prev) !== JSON.stringify(newCommonAreas) ? newCommonAreas : prev);
            }

            // 10. Configs
            if (confData) {
                const configs = confData;
                
                // Theme Settings parsing
                const themeConfig = configs.find((c: any) => c.key === 'theme_settings');
                if (themeConfig && themeConfig.value) {
                    try {
                        let parsed;
                        const rawValue = typeof themeConfig.value === 'string' ? themeConfig.value : JSON.stringify(themeConfig.value);
                        
                        try {
                            parsed = JSON.parse(rawValue);
                        } catch (e) {
                            console.warn("[SYNC_DIAGNOSTIC] Valor inválido JSON para theme_settings, usando default", rawValue);
                            parsed = DEFAULT_THEME_SETTINGS;
                            supabase.from('app_config').upsert({ key: 'theme_settings', value: DEFAULT_THEME_SETTINGS }, { onConflict: 'key' }).then(() => console.log("[SYNC_DIAGNOSTIC] Autocorreção de 'theme_settings' realizada"));
                        }
                        
                        if (parsed && typeof parsed === 'object') {
                            if (!parsed.towerNames || !Array.isArray(parsed.towerNames) || parsed.towerNames.length === 0) {
                                parsed.towerNames = ['Torre 1', 'Torre 2', 'Torre 3'];
                            }
                            const settingsWithId = { ...parsed, id: 'active' };
                            setThemeSettings(prev => JSON.stringify(prev) !== JSON.stringify(settingsWithId) ? settingsWithId : prev);
                        }
                    } catch (pe) {
                        console.error("[SYNC_DIAGNOSTIC] Erro ao processar theme_settings:", pe);
                    }
                }

                // Operator Settings parsing
                const operatorConfig = configs.find((c: any) => c.key === 'operator_settings');
                if (operatorConfig && operatorConfig.value) {
                    try {
                        let parsed;
                        const rawValue = typeof operatorConfig.value === 'string' ? operatorConfig.value : JSON.stringify(operatorConfig.value);

                        try {
                            parsed = JSON.parse(rawValue);
                        } catch (e) {
                            console.warn("[SYNC_DIAGNOSTIC] Valor inválido JSON para operator_settings, usando default", rawValue);
                            parsed = { operatorName: 'Op. Ricardo Silva', portName: 'Portaria Norte', operatorAvatarUrl: '' };
                            supabase.from('app_config').upsert({ key: 'operator_settings', value: parsed }, { onConflict: 'key' }).then(() => console.log("[SYNC_DIAGNOSTIC] Autocorreção de 'operator_settings' realizada"));
                        }
                        
                        if (parsed && typeof parsed === 'object') {
                            if (parsed.operatorName) {
                                setOperatorName(prev => prev !== parsed.operatorName ? parsed.operatorName : prev);
                                setCurrentUser(prev => {
                                    if (prev && (prev.role === 'Administrador' || prev.id === 'admin')) {
                                        if (prev.name !== parsed.operatorName) {
                                            return { ...prev, name: parsed.operatorName };
                                        }
                                    }
                                    return prev;
                                });
                            }
                            if (parsed.portName) setPortName(prev => prev !== parsed.portName ? parsed.portName : prev);
                            if (parsed.operatorAvatarUrl !== undefined) setOperatorAvatarUrl(prev => prev !== parsed.operatorAvatarUrl ? parsed.operatorAvatarUrl : prev);
                        }
                    } catch (pe) {
                        console.error("[SYNC_DIAGNOSTIC] Erro ao processar operator_settings:", pe);
                    }
                }

                // Admin Password parsing
                const passwordConfig = configs.find((c: any) => c.key === 'admin_password');
                if (passwordConfig && passwordConfig.value) {
                    const rawVal = passwordConfig.value;
                    let cleanPass = rawVal;
                    if (typeof rawVal === 'string') {
                        try {
                            cleanPass = JSON.parse(rawVal);
                        } catch (e) {
                            cleanPass = rawVal;
                        }
                    }
                    setAdminPassword(prev => prev !== cleanPass ? cleanPass : prev);
                }

                // Incident Categories parsing
                const incidentCategoriesConfig = configs.find((c: any) => c.key === 'incident_categories');
                if (incidentCategoriesConfig && incidentCategoriesConfig.value) {
                    try {
                        let parsed;
                        const rawValue = typeof incidentCategoriesConfig.value === 'string' ? incidentCategoriesConfig.value : JSON.stringify(incidentCategoriesConfig.value);
                        try {
                            parsed = JSON.parse(rawValue);
                        } catch (e) {
                            parsed = incidentCategoriesConfig.value;
                        }
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setIncidentCategories(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
                        }
                    } catch (pe) {
                        console.error("[SYNC_DIAGNOSTIC] Erro ao processar incident_categories:", pe);
                    }
                }
            }
        } catch (e: any) {
            console.error("[SYNC_DIAGNOSTIC] Falha crítica de sincronização geral:", e);
        }
    }
    
    loadData();
    
    // Set interval for 5s sync (falls back to 30s if realtime is active)
    const interval = setInterval(() => {
        if (realtimeActiveRef.current) {
            // Realtime is active. Do a full safety fetch only every 30 seconds.
            const now = Date.now();
            if (now - lastFullFetchTimeRef.current >= 30000) {
                lastFullFetchTimeRef.current = now;
                loadData();
            }
        } else {
            // Realtime is inactive, poll every 5 seconds
            loadData();
        }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Sync to database helpers
  const saveResidents = async (updated: Resident[]) => {
    lastWriteTimeRef.current = Date.now();
    setResidents(updated);
    const dataToSave = updated.map(r => {
      const cleanEmail = (r.email && r.email.trim() !== "" && r.email !== "Não cadastrado") ? r.email.trim() : null;
      return {
        id: r.id,
        name: r.name,
        unit: r.unit,
        phone: r.phone,
        email: cleanEmail,
        vehicles: r.vehicles,
        members: r.members,
        status: r.status,
        avatar_url: r.avatarUrl,
        role: r.role,
        password: r.password || '1234',
        biometrics_active: false 
      };
    });
    
    // Check for duplicate emails
    const emails = new Set<string>();
    const hasDuplicates = dataToSave.some(r => {
      if (!r.email) return false;
      if (emails.has(r.email.toLowerCase())) return true;
      emails.add(r.email.toLowerCase());
      return false;
    });

    if (hasDuplicates) {
      setToast({ message: 'Erro: Não é possível salvar pois existem moradores com o mesmo e-mail.', type: 'info' });
      return;
    }

    try {
      await Promise.all(updated.map(r => residentsRepository.upsert(r)));
      setToast({ message: 'Moradores salvos e sincronizados com sucesso!', type: 'success' });
    } catch (e) {
      console.error("[SYNC_ERROR] Falha na gravação:", e);
      setToast({ message: 'Falha na sincronização.', type: 'warning' });
    }
  };

  const saveVisitors = async (updated: Visitor[]) => {
    lastWriteTimeRef.current = Date.now();
    setVisitors(updated);
    try {
      await Promise.all(updated.map(v => visitorsRepository.upsert(v)));
      setToast({ message: 'Visitante salvo e sincronizado na nuvem!', type: 'success' });
    } catch (e) {
      console.error("[SYNC_ERROR] Falha na gravação de visitantes:", e);
      setToast({ message: 'Falha na sincronização.', type: 'warning' });
    }
  };

  const saveBookings = async (updated: Booking[]) => {
    lastWriteTimeRef.current = Date.now();
    setBookings(updated);
    try {
      await Promise.all(updated.map(b => bookingsRepository.upsert(b)));
      setToast({ message: 'Reserva salva e sincronizada na nuvem!', type: 'success' });
    } catch (e) {
      console.error("[SYNC_ERROR] Falha na gravação de reservas:", e);
      setToast({ message: 'Falha na sincronização.', type: 'warning' });
    }
  };

  const saveAnnouncements = async (updated: Announcement[]) => {
    lastWriteTimeRef.current = Date.now();
    setAnnouncements(updated);
    try {
      await Promise.all(updated.map(a => announcementsRepository.upsert(a)));
      setToast({ message: 'Aviso salvo e sincronizado na nuvem!', type: 'success' });
    } catch (e) {
      console.error("[SYNC_ERROR] Falha na gravação de avisos:", e);
      setToast({ message: 'Falha na sincronização.', type: 'warning' });
    }
  };

  const saveIncidents = async (updated: Incident[], modifiedItem?: Incident) => {
    lastWriteTimeRef.current = Date.now();
    setIncidents(updated);
    
    // Determine the item to save
    const itemToSave = modifiedItem || updated[0];
    if (!itemToSave) return;

    try {
      await incidentsRepository.upsert(itemToSave);
      setToast({ message: 'Ocorrência salva e sincronizada na nuvem!', type: 'success' });
    } catch (e) {
      console.error("[SYNC_ERROR] Falha na gravação:", e);
      setToast({ message: 'Falha na sincronização.', type: 'warning' });
    }
  };

  const handleRemoveBooking = async (id: string, reason?: string) => {
    const original = bookings.find(b => b.id === id);
    if (!original) return;
    const askReason = reason || window.prompt('Informe o motivo do cancelamento / exclusão desta reserva:', 'Cancelamento solicitado pelo morador') || 'Removido via painel de administração';
    
    const updatedItem = {
      ...original,
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser?.name || 'Administrador',
      deletion_reason: askReason
    };

    const updated = bookings.map(b => b.id === id ? updatedItem : b);
    setBookings(updated);
    addToSyncQueue('bookings', 'upsert', toSnakeCase(updatedItem));
    addAuditLog('DELETE', 'Reservas', id, original, updatedItem);
    setToast({ message: 'Agendamento cancelado e arquivado logicamente com sucesso.', type: 'success' });
  };

  const handleRemoveResident = async (id: string, reason?: string) => {
    const original = residents.find(r => r.id === id);
    if (!original) return;
    const askReason = reason || window.prompt('Informe o motivo da desativação/exclusão deste morador:', 'Residente mudou-se do condomínio') || 'Mudança';

    const updatedItem = {
      ...original,
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser?.name || 'Administrador',
      deletion_reason: askReason
    };

    const updated = residents.map(r => r.id === id ? updatedItem : r);
    setResidents(updated);

    addToSyncQueue('residents', 'upsert', {
      id: updatedItem.id,
      name: updatedItem.name,
      unit: updatedItem.unit,
      phone: updatedItem.phone,
      email: updatedItem.email || null,
      vehicles: updatedItem.vehicles,
      members: updatedItem.members,
      status: updatedItem.status,
      avatar_url: updatedItem.avatarUrl || null,
      role: updatedItem.role || 'Morador',
      password: updatedItem.password || '1234',
      biometrics_active: false,
      deleted_at: updatedItem.deleted_at,
      deleted_by: updatedItem.deleted_by,
      deletion_reason: updatedItem.deletion_reason
    });
    
    addAuditLog('DELETE', 'Moradores', id, original, updatedItem);
    setToast({ message: 'Morador arquivado e desativado com sucesso.', type: 'success' });
  };

  const handleRemoveVisitor = async (id: string, reason?: string) => {
    const original = visitors.find(v => v.id === id);
    if (!original) return;
    const askReason = reason || window.prompt('Motivo da exclusão do cadastro de visitante:', 'Fim do período de visitas ou correção') || 'Excluído';

    const updatedItem = {
      ...original,
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser?.name || 'Administrador',
      deletion_reason: askReason
    };

    const updated = visitors.map(v => v.id === id ? updatedItem : v);
    setVisitors(updated);
    addToSyncQueue('visitors', 'upsert', toSnakeCase(updatedItem));
    addAuditLog('DELETE', 'Visitantes', id, original, updatedItem);
    setToast({ message: 'Visitante arquivado logicamente com sucesso.', type: 'success' });
  };

  const handleRemoveAnnouncement = async (id: string, reason?: string) => {
    const original = announcements.find(a => a.id === id);
    if (!original) return;
    const askReason = reason || window.prompt('Motivo da remoção do comunicado:', 'Comunicado expirado ou obsoletado') || 'Expiração de comunicado';

    const updatedItem = {
      ...original,
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser?.name || 'Administrador',
      deletion_reason: askReason
    };

    const updated = announcements.map(a => a.id === id ? updatedItem : a);
    setAnnouncements(updated);
    addToSyncQueue('announcements', 'upsert', toSnakeCase(updatedItem));
    addAuditLog('DELETE', 'Comunicados', id, original, updatedItem);
    setToast({ message: 'Comunicado removido logicamente com sucesso.', type: 'success' });
  };

  const handleRemoveIncident = async (id: string, reason?: string) => {
    const original = incidents.find(i => i.id === id);
    if (!original) return;

    const askReason = reason || window.prompt('Motivo da exclusão permanente do chamado de ocorrência:', 'Cancelamento/Exclusão') || 'Excluído';

    // Remove the occurrence from our local in-memory representation and Dexie storage immediately
    const updated = incidents.filter(i => i.id !== id);
    setIncidents(updated);

    try {
      // Use direct supabase import
      const { error } = await supabase.from('incidents').delete().eq('id', id);
      if (error) throw error;
      setToast({ message: 'Ocorrência excluída com sucesso da nuvem!', type: 'success' });
    } catch (e) {
      console.error("[SYNC_ERROR] Falha na exclusão imediata de ocorrência:", e);
      // Queue a persistent deletion event
      addToSyncQueue('incidents', 'delete', id);
      setToast({ message: 'Falha na sincronização imediata (salvo localmente). O sistema tentará novamente em breve.', type: 'warning' });
    }
    
    // Add record to the audit trails
    addAuditLog('DELETE', 'Ocorrências', id, original, { ...original, deletion_reason: askReason });
  };

  const saveEncomendas = async (updated: Encomenda[]) => {
    setEncomendas(updated);
    try {
      await Promise.all(updated.map(e => encomendasRepository.upsert(e)));
    } catch (e) {
      console.error("[SYNC_ERROR]", e);
      setToast({ message: 'Falha na sincronização.', type: 'warning' });
    }
  };

  const saveCommonArea = async (area: CommonArea) => {
    setCommonAreas(prev => prev.map(a => a.id === area.id ? area : a));
    try {
      await commonAreasRepository.upsert(area);
      addAuditLog('UPDATE', 'Áreas Comuns', area.id, commonAreas.find(a => a.id === area.id), area);
    } catch (e) {
      console.error("[SYNC_ERROR]", e);
      setToast({ message: 'Falha na sincronização.', type: 'warning' });
    }
  };
  
  const deleteCommonArea = async (id: string, reason?: string) => {
    const original = commonAreas.find(c => c.id === id);
    if (!original) return;
    const askReason = reason || window.prompt('Motivo de remover esta área comum:', 'Espaço desativado') || 'Desativação';

    const updatedItem = {
      ...original,
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser?.name || 'Administrador',
      deletion_reason: askReason
    };

    setCommonAreas(prev => prev.map(c => c.id === id ? updatedItem : c));
    addToSyncQueue('common_areas', 'upsert', [toSnakeCase(updatedItem)]);
    addAuditLog('DELETE', 'Áreas Comuns', id, original, updatedItem);
    setToast({ message: 'Área comum arquivada logicamente.', type: 'success' });
  };

  const handleAddEncomenda = (newEnc: Encomenda) => {
    const updated = [newEnc, ...encomendas];
    saveEncomendas(updated);
    addAuditLog('CREATE', 'Encomendas', newEnc.id, undefined, newEnc);
    setActivePackageToast(newEnc);
    setToast({ message: 'Encomenda cadastrada com sucesso!', type: 'success' });
  };

  const handleDeliverEncomenda = (id: string, details: { quemRetirou: string; responsavelEntrega: string; dataRetirada: string }) => {
    const oldEncomenda = encomendas.find(e => e?.id === id);
    const updatedItem = oldEncomenda ? {
      ...oldEncomenda,
      status: 'Entregue' as const,
      ...details
    } : null;

    const updated = encomendas.map(e => e.id === id ? {
      ...e,
      status: 'Entregue' as const,
      ...details
    } : e);
    saveEncomendas(updated);
    if (oldEncomenda && updatedItem) {
      addAuditLog('UPDATE', 'Encomendas', id, oldEncomenda, updatedItem);
    }
    setToast({ message: 'Encomenda entregue com sucesso!', type: 'success' });
  };

  const handleRemoveEncomenda = async (id: string, reason?: string) => {
    const original = encomendas.find(e => e?.id === id);
    if (!original) return;
    const askReason = reason || window.prompt('Motivo do arquivamento desta encomenda:', 'Correção de digitação / Extravio') || 'Correção';

    const updatedItem = {
      ...original,
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser?.name || 'Administrador',
      deletion_reason: askReason
    };

    const updated = encomendas.map(e => e?.id === id ? updatedItem : e);
    setEncomendas(updated);
    addToSyncQueue('encomendas', 'upsert', toSnakeCase(updatedItem));
    addAuditLog('DELETE', 'Encomendas', id, original, updatedItem);
    setToast({ message: 'Encomenda arquivada logicamente com sucesso.', type: 'success' });
  };

  const handleAddAchadosPerdidos = (item: AchadosPerdidos, files: string[], hist: AchadosPerdidosHistorico) => {
    const updatedItems = [item, ...achadosPerdidos];
    setAchadosPerdidos(updatedItems);
    addToSyncQueue('achados_perdidos', 'upsert', toSnakeCase(item));

    if (files && files.length > 0) {
      const newFotos: AchadosPerdidosFoto[] = files.map(url => {
        const fotoItem: AchadosPerdidosFoto = {
          id: crypto.randomUUID(),
          objeto_id: item.id,
          url_foto: url,
          created_at: new Date().toISOString()
        };
        return fotoItem;
      });
      const updatedFotos = [...newFotos, ...achadosPerdidosFotos];
      setAchadosPerdidosFotos(updatedFotos);
      newFotos.forEach(foto => {
        addToSyncQueue('achados_perdidos_fotos', 'upsert', toSnakeCase(foto));
      });
    }

    const updatedHist = [hist, ...achadosPerdidosHistorico];
    setAchadosPerdidosHistorico(updatedHist);
    addToSyncQueue('achados_perdidos_historico', 'upsert', toSnakeCase(hist));

    addAuditLog('CREATE', 'Achados e Perdidos', item.id, undefined, item);
    setToast({ message: 'Objeto registrado com sucesso!', type: 'success' });
  };

  const handleUpdateAchadosPerdidos = (item: AchadosPerdidos, hist?: AchadosPerdidosHistorico) => {
    const original = achadosPerdidos.find(a => a.id === item.id);
    
    const updatedItems = achadosPerdidos.map(a => a.id === item.id ? item : a);
    setAchadosPerdidos(updatedItems);
    addToSyncQueue('achados_perdidos', 'upsert', toSnakeCase(item));

    if (hist) {
      const updatedHist = [hist, ...achadosPerdidosHistorico];
      setAchadosPerdidosHistorico(updatedHist);
      addToSyncQueue('achados_perdidos_historico', 'upsert', toSnakeCase(hist));
    }

    if (original) {
      addAuditLog('UPDATE', 'Achados e Perdidos', item.id, original, item);
    }
    setToast({ message: 'Ocorrência de Achados e Perdidos atualizada com sucesso!', type: 'success' });
  };

  const handleRemoveAchadosPerdidos = (id: string, reason: string) => {
    const original = achadosPerdidos.find(a => a.id === id);
    if (!original) return;

    const updatedItem = {
      ...original,
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser?.name || 'Administrador',
      deletion_reason: reason
    };

    const updated = achadosPerdidos.map(a => a.id === id ? updatedItem : a);
    setAchadosPerdidos(updated);
    addToSyncQueue('achados_perdidos', 'upsert', toSnakeCase(updatedItem));

    const hist: AchadosPerdidosHistorico = {
      id: crypto.randomUUID(),
      objeto_id: id,
      usuario_id: currentUser?.id || 'admin',
      usuario_nome: currentUser?.name || 'Administrador',
      acao: 'Exclusão',
      observacao: `Objeto removido da listagem ativa. Motivo: ${reason}`,
      created_at: new Date().toISOString()
    };
    const updatedHist = [hist, ...achadosPerdidosHistorico];
    setAchadosPerdidosHistorico(updatedHist);
    addToSyncQueue('achados_perdidos_historico', 'upsert', toSnakeCase(hist));

    addAuditLog('DELETE', 'Achados e Perdidos', id, original, updatedItem);
    setToast({ message: 'Registro arquivado com sucesso.', type: 'success' });
  };

  // Terminal Credentials & Security Handlers
  const handleSavePassword = async (newPass: string) => {
    const oldPass = adminPassword;
    setAdminPassword(newPass);
    addAuditLog('PASSWORD_CHANGE', 'Configurações', 'admin_password', '***OLD_PASSWORD_HIDDEN***', '***NEW_PASSWORD_HIDDEN***');
    addToSyncQueue('app_config', 'upsert', {
      key: 'admin_password',
      value: newPass
    });
    setToast({ message: 'Senha salva localmente e sincronizando com a nuvem...', type: 'success' });
  };

  const handleSaveOperatorDetails = async (newOpName: string, newPortName: string, newAvatarUrl: string) => {
    const oldConfig = {
      operatorName,
      portName,
      operatorAvatarUrl
    };
    setOperatorName(newOpName);
    setPortName(newPortName);
    setOperatorAvatarUrl(newAvatarUrl);

    // Also update current active user name if they are logged in as admin
    if (currentUser && currentUser.id === 'admin') {
      const updatedUser = { ...currentUser, name: newOpName };
      setCurrentUser(updatedUser);
    }

    const newConfig = {
      operatorName: newOpName,
      portName: newPortName,
      operatorAvatarUrl: newAvatarUrl
    };
    addAuditLog('UPDATE', 'Configurações', 'operator_settings', oldConfig, newConfig);

    addToSyncQueue('app_config', 'upsert', {
      key: 'operator_settings',
      value: JSON.stringify(newConfig)
    });
    setToast({ message: 'Configurações salvas e sincronizando...', type: 'success' });
  };

  const handleSaveThemeSettings = async (newSettings: ThemeSettings) => {
    const oldSettings = themeSettings;
    const settingsWithId = { ...newSettings, id: 'active' };
    setThemeSettings(settingsWithId);
    localStorage.setItem('theme_settings', JSON.stringify(settingsWithId));
    addAuditLog('UPDATE', 'Configurações', 'theme_settings', oldSettings, settingsWithId);
    addToSyncQueue('app_config', 'upsert', {
      key: 'theme_settings',
      value: JSON.stringify(settingsWithId)
    });
    setToast({ message: 'Configurações de tema salvas e sincronizando...', type: 'success' });
  };

  const handleSaveLoginCustomization = async (newConfig: LoginCustomization): Promise<boolean> => {
    const oldConfig = loginCustomization;
    setLoginCustomization(newConfig);
    addAuditLog('UPDATE', 'Configurações', 'login_customization', oldConfig, newConfig);
    
    addToSyncQueue('login_customization', 'upsert', toSnakeCase(newConfig));
    
    try {
      const res = await fetch('/api/save-login-customization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setToast({ message: 'Personalização da tela de login salva com sucesso!', type: 'success' });
        return true;
      }
    } catch (e) {
      console.warn('[LOGIN_CUSTOM] Erro ao salvar via API, mantendo local.', e);
    }
    
    setToast({ message: 'Personalização do login salva localmente.', type: 'info' });
    return true;
  };

  // Restoration logic for reverting a record back to a previous audited historical checkpoint
  const handleRestoreFromAuditLog = (log: AuditLog) => {
    if (!log.old_data || !log.record_id) return;
    
    const recordId = log.record_id;
    const oldState = log.old_data;
    
    if (log.module === 'Moradores') {
      const current = residents.find(r => r.id === recordId);
      setResidents(prev => {
        const exists = prev.some(r => r.id === recordId);
        if (exists) {
          return prev.map(r => r.id === recordId ? oldState : r);
        } else {
          return [oldState, ...prev];
        }
      });
      addToSyncQueue('residents', 'upsert', {
        id: oldState.id,
        name: oldState.name,
        unit: oldState.unit,
        phone: oldState.phone,
        email: oldState.email || null,
        vehicles: oldState.vehicles || [],
        members: oldState.members || [],
        status: oldState.status,
        avatar_url: oldState.avatarUrl || null,
        password: oldState.password || '1234',
        role: oldState.role || 'Morador'
      });
      addAuditLog('RESTORE', 'Moradores', recordId, current, oldState);
    } else if (log.module === 'Visitantes') {
      const current = visitors.find(r => r.id === recordId);
      setVisitors(prev => {
        const exists = prev.some(r => r.id === recordId);
        if (exists) return prev.map(r => r.id === recordId ? oldState : r);
        return [oldState, ...prev];
      });
      addToSyncQueue('visitors', 'upsert', toSnakeCase(oldState));
      addAuditLog('RESTORE', 'Visitantes', recordId, current, oldState);
    } else if (log.module === 'Reservas') {
      const current = bookings.find(r => r.id === recordId);
      setBookings(prev => {
        const exists = prev.some(r => r.id === recordId);
        if (exists) return prev.map(r => r.id === recordId ? oldState : r);
        return [oldState, ...prev];
      });
      addToSyncQueue('bookings', 'upsert', toSnakeCase(oldState));
      addAuditLog('RESTORE', 'Reservas', recordId, current, oldState);
    } else if (log.module === 'Comunicados') {
      const current = announcements.find(r => r.id === recordId);
      setAnnouncements(prev => {
        const exists = prev.some(r => r.id === recordId);
        if (exists) return prev.map(r => r.id === recordId ? oldState : r);
        return [oldState, ...prev];
      });
      addToSyncQueue('announcements', 'upsert', toSnakeCase(oldState));
      addAuditLog('RESTORE', 'Comunicados', recordId, current, oldState);
    } else if (log.module === 'Ocorrências') {
      const current = incidents.find(r => r.id === recordId);
      setIncidents(prev => {
        const exists = prev.some(r => r.id === recordId);
        if (exists) return prev.map(r => r.id === recordId ? oldState : r);
        return [oldState, ...prev];
      });
      addToSyncQueue('incidents', 'upsert', toSnakeCase(oldState));
      addAuditLog('RESTORE', 'Ocorrências', recordId, current, oldState);
    } else if (log.module === 'Encomendas') {
      const current = encomendas.find(r => r?.id === recordId);
      setEncomendas(prev => {
        const exists = prev.some(r => r?.id === recordId);
        if (exists) return prev.map(r => r?.id === recordId ? oldState : r);
        return [oldState, ...prev];
      });
      addToSyncQueue('encomendas', 'upsert', toSnakeCase(oldState));
      addAuditLog('RESTORE', 'Encomendas', recordId, current, oldState);
    } else if (log.module === 'Áreas Comuns') {
      const current = commonAreas.find(r => r.id === recordId);
      setCommonAreas(prev => {
        const exists = prev.some(r => r.id === recordId);
        if (exists) return prev.map(r => r.id === recordId ? oldState : r);
        return [oldState, ...prev];
      });
      addToSyncQueue('common_areas', 'upsert', [toSnakeCase(oldState)]);
      addAuditLog('RESTORE', 'Áreas Comuns', recordId, current, oldState);
    }
    
    setToast({ message: `Registro restaurado para a versão de ${new Date(log.created_at).toLocaleString('pt-BR')}`, type: 'success' });
  };

  // Recycle bin un-delete (removes deleted_at properties)
  const handleRestoreDeletedItem = (module: string, itemId: string) => {
    let restoredName = '';
    
    if (module === 'Moradores') {
      const original = residents.find(r => r.id === itemId);
      if (original) {
        restoredName = original.name;
        const restoredItem = { ...original };
        delete restoredItem.deleted_at;
        delete restoredItem.deleted_by;
        delete restoredItem.deletion_reason;
        
        setResidents(prev => prev.map(r => r.id === itemId ? restoredItem : r));
        addToSyncQueue('residents', 'upsert', {
          id: restoredItem.id,
          name: restoredItem.name,
          unit: restoredItem.unit,
          phone: restoredItem.phone,
          email: restoredItem.email || null,
          vehicles: restoredItem.vehicles || [],
          members: restoredItem.members || [],
          status: restoredItem.status,
          avatar_url: restoredItem.avatarUrl || null,
          role: restoredItem.role || 'Morador',
          password: restoredItem.password || '1234',
          biometrics_active: false,
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null
        });
        addAuditLog('RESTORE', 'Moradores', itemId, original, restoredItem);
      }
    } else if (module === 'Visitantes') {
      const original = visitors.find(v => v.id === itemId);
      if (original) {
        restoredName = original.name;
        const restoredItem = { ...original };
        delete restoredItem.deleted_at;
        delete restoredItem.deleted_by;
        delete restoredItem.deletion_reason;
        
        setVisitors(prev => prev.map(v => v.id === itemId ? restoredItem : v));
        addToSyncQueue('visitors', 'upsert', toSnakeCase(restoredItem));
        addAuditLog('RESTORE', 'Visitantes', itemId, original, restoredItem);
      }
    } else if (module === 'Reservas') {
      const original = bookings.find(b => b.id === itemId);
      if (original) {
        restoredName = `Reserva de ${original.residentName}`;
        const restoredItem = { ...original };
        delete restoredItem.deleted_at;
        delete restoredItem.deleted_by;
        delete restoredItem.deletion_reason;
        
        setBookings(prev => prev.map(b => b.id === itemId ? restoredItem : b));
        addToSyncQueue('bookings', 'upsert', toSnakeCase(restoredItem));
        addAuditLog('RESTORE', 'Reservas', itemId, original, restoredItem);
      }
    } else if (module === 'Comunicados') {
      const original = announcements.find(a => a.id === itemId);
      if (original) {
        restoredName = original.title;
        const restoredItem = { ...original };
        delete restoredItem.deleted_at;
        delete restoredItem.deleted_by;
        delete restoredItem.deletion_reason;
        
        setAnnouncements(prev => prev.map(a => a.id === itemId ? restoredItem : a));
        addToSyncQueue('announcements', 'upsert', toSnakeCase(restoredItem));
        addAuditLog('RESTORE', 'Comunicados', itemId, original, restoredItem);
      }
    } else if (module === 'Ocorrências') {
      const original = incidents.find(i => i.id === itemId);
      if (original) {
        restoredName = original.title;
        const restoredItem = { ...original };
        delete restoredItem.deleted_at;
        delete restoredItem.deleted_by;
        delete restoredItem.deletion_reason;
        
        setIncidents(prev => prev.map(i => i.id === itemId ? restoredItem : i));
        addToSyncQueue('incidents', 'upsert', toSnakeCase(restoredItem));
        addAuditLog('RESTORE', 'Ocorrências', itemId, original, restoredItem);
      }
    } else if (module === 'Encomendas') {
      const original = encomendas.find(e => e?.id === itemId);
      if (original) {
        restoredName = original.codigoRastreio;
        const restoredItem = { ...original };
        delete restoredItem.deleted_at;
        delete restoredItem.deleted_by;
        delete restoredItem.deletion_reason;
        
        setEncomendas(prev => prev.map(e => e?.id === itemId ? restoredItem : e));
        addToSyncQueue('encomendas', 'upsert', toSnakeCase(restoredItem));
        addAuditLog('RESTORE', 'Encomendas', itemId, original, restoredItem);
      }
    } else if (module === 'Áreas Comuns') {
      const original = commonAreas.find(c => c.id === itemId);
      if (original) {
        restoredName = original.name;
        const restoredItem = { ...original };
        delete restoredItem.deleted_at;
        delete restoredItem.deleted_by;
        delete restoredItem.deletion_reason;
        
        setCommonAreas(prev => prev.map(c => c.id === itemId ? restoredItem : c));
        addToSyncQueue('common_areas', 'upsert', [toSnakeCase(restoredItem)]);
        addAuditLog('RESTORE', 'Áreas Comuns', itemId, original, restoredItem);
      }
    }

    setToast({ message: `"${restoredName}" foi restaurado com sucesso!`, type: 'success' });
  };

  const handleSetPanelLockedState = (lockedState: boolean) => {
    setIsPanelLocked(lockedState);
    if (lockedState === false) {
      localStorage.setItem('isUnlocked', 'true');
    } else {
      if (currentUser) {
        addAuditLog('LOGOUT', 'Autenticação', currentUser.id, null, null);
      }
      localStorage.removeItem('isUnlocked');
      localStorage.removeItem('currentUser');
      setCurrentUser({
        id: 'admin',
        name: operatorName,
        role: 'Administrador'
      });
    }
  };

  const handleUnlockConsole = React.useCallback((userId: string, passwordInput: string): boolean => {
    if (userId === 'admin') {
      if (passwordInput === adminPassword) {
        const adminUser = { id: 'admin', name: operatorName, role: 'Administrador' as const };
        setCurrentUser(adminUser);
        handleSetPanelLockedState(false);
        addAuditLog('LOGIN', 'Autenticação', 'admin', null, adminUser);
        return true;
      }
      addAuditLog('LOGIN_FAILED', 'Autenticação', 'admin', null, null, 'Senha do console master incorreta');
      return false;
    }

    // Try finding resident by id, name, or email
    const searchUserId = userId.toLowerCase().trim();
    const found = residents.find(r => 
      !r.deleted_at && (
        r.id.toLowerCase() === searchUserId || 
        (r.name && r.name.toLowerCase().includes(searchUserId)) || 
        (r.email && r.email.toLowerCase() === searchUserId)
      )
    );
    
    if (!found) {
      addAuditLog('LOGIN_FAILED', 'Autenticação', searchUserId, null, null, 'Nenhum usuário/morador correspondente cadastrado');
      return false;
    }

    const correctPassword = found.password || '1234';
    if (passwordInput === correctPassword) {
      if (found.status === 'Bloqueado') {
        alert('Este morador está temporariamente bloqueado. Contacte a administração.');
        addAuditLog('LOGIN_FAILED', 'Autenticação', found.id, null, null, 'Tentativa de login em conta bloqueada');
        return false;
      }
      const user = { 
        id: found.id, 
        name: found.name, 
        unit: found.unit, 
        role: found.role || 'Morador' 
      };
      setCurrentUser(user);
      
      // Auto redirect to appropriate tabs depending on user profile
      const targetRole = found.role || 'Morador';
      if (targetRole === 'Morador') {
        setActiveTab('dashboard');
      } else if (targetRole === 'Porteiro') {
        setActiveTab('dashboard');
      }
      
      handleSetPanelLockedState(false);
      addAuditLog('LOGIN', 'Autenticação', found.id, null, user);
      return true;
    }

    addAuditLog('LOGIN_FAILED', 'Autenticação', found.id, null, null, 'Senha de morador informada incorretamente');
    return false;
  }, [residents, adminPassword, operatorName, handleSetPanelLockedState, setCurrentUser, setActiveTab, addAuditLog]);

  // State manipulation Handlers
  // 1. Visitors Handlers
  const handleAddVisitor = React.useCallback((newVisitor: Visitor) => {
    // Validation: Check if there is an active visitor with the exact same document who is already 'Dentro'
    const cleanDoc = newVisitor.document?.trim();
    if (cleanDoc && newVisitor.status === 'Dentro') {
      const activeVisitor = visitors.find(v => v.document?.trim() === cleanDoc && v.status === 'Dentro' && !v.deleted_at);
      if (activeVisitor) {
        setToast({ message: `Erro: O visitante "${newVisitor.name}" já consta como ativo/dentro do condomínio.`, type: 'info' });
        return;
      }
    }

    const withPin = {
      ...newVisitor,
      exitCode: newVisitor.exitCode || Math.floor(1000 + Math.random() * 9000).toString()
    };
    
    // Optimistic update
    lastWriteTimeRef.current = Date.now();
    setVisitors(prev => [withPin, ...prev]);
    
    // Sync to DB
    visitorsRepository.upsert(withPin).catch(e => {
      console.error("[SYNC_ERROR] Falha na gravação de visitantes:", e);
      setToast({ message: 'Falha na sincronização.', type: 'warning' });
    });

    addAuditLog('CREATE', 'Visitantes', newVisitor.id, undefined, withPin);
    if (withPin.status === 'Dentro') {
      triggerCancelaRelease(withPin.name, withPin.vehiclePlate || undefined, 'visitor');
    }
    setToast({ message: 'Visitante cadastrado com sucesso!', type: 'success' });
  }, [visitors, triggerCancelaRelease]);

  const handleAddVisitorFromResident = (visitorData: Omit<Visitor, 'id' | 'createdAt' | 'entryTime' | 'exitTime' | 'status'>) => {
    const valDuration = visitorData.validityDuration || '24h';
    let durationMs = 24 * 60 * 60 * 1000;
    if (valDuration === '3h') durationMs = 3 * 60 * 60 * 1000;
    else if (valDuration === '6h') durationMs = 6 * 60 * 60 * 1000;
    else if (valDuration === '12h') durationMs = 12 * 60 * 60 * 1000;
    else if (valDuration === '24h') durationMs = 24 * 60 * 60 * 1000;
    else if (valDuration === '3d') durationMs = 3 * 24 * 60 * 60 * 1000;
    else if (valDuration === '5d') durationMs = 5 * 24 * 60 * 60 * 1000;
    else if (valDuration === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;

    const expirationTime = new Date(Date.now() + durationMs).toISOString();

    const newVisitor: Visitor = {
        ...visitorData,
        id: crypto.randomUUID(),
        status: 'Pre-Autorizado', 
        createdAt: new Date().toISOString(),
        entryTime: null,
        exitTime: null,
        validityDuration: valDuration,
        expirationTime: expirationTime
    };
    handleAddVisitor(newVisitor);
  };

  const handleCheckOutVisitor = (id: string) => {
    const oldVisitor = visitors.find(v => v.id === id);
    const updatedUser = oldVisitor ? { ...oldVisitor, status: 'Saiu' as const, exitTime: new Date().toISOString() } : null;
    const updated = visitors.map(v => 
      v.id === id ? updatedUser! : v
    );
    saveVisitors(updated);
    if (oldVisitor && updatedUser) {
      addAuditLog('UPDATE', 'Visitantes', id, oldVisitor, updatedUser);
    }
    setToast({ message: 'Saída de visitante registrada com sucesso!', type: 'success' });
  };

  const handleUpdateVisitorStatus = (id: string, status: 'Pre-Autorizado' | 'Dentro' | 'Saiu' | 'Recusado') => {
    const oldVisitor = visitors.find(v => v.id === id);
    let updatedItem: any = null;
    const updated = visitors.map(v => {
      if (v.id === id) {
        if (status === 'Dentro') {
          triggerCancelaRelease(v.name, v.vehiclePlate || undefined, 'visitor');
          updatedItem = {
            ...v,
            status,
            entryTime: new Date().toISOString(),
            exitCode: `SAIDA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          };
          return updatedItem;
        }
        
        updatedItem = {
          ...v,
          status,
          entryTime: (status as any) === 'Dentro' ? new Date().toISOString() : v.entryTime,
          exitTime: status === 'Saiu' || status === 'Recusado' ? new Date().toISOString() : v.exitTime
        };
        return updatedItem;
      }
      return v;
    });
    saveVisitors(updated);
    if (oldVisitor && updatedItem) {
      addAuditLog('UPDATE', 'Visitantes', id, oldVisitor, updatedItem);
    }
    setToast({ message: `Status do visitante atualizado para "${status}" com sucesso!`, type: 'success' });
  };

  const handleUpdateResidentAvatar = (id: string, avatarUrl: string) => {
    const oldResident = residents.find(r => r.id === id);
    const updatedUser = oldResident ? { ...oldResident, avatarUrl } : null;
    const updated = residents.map(r => 
      r.id === id ? updatedUser! : r
    );
    saveResidents(updated);
    if (oldResident && updatedUser) {
      addAuditLog('UPDATE', 'Moradores', id, oldResident, updatedUser);
    }
    setToast({ message: 'Avatar do morador atualizado com sucesso!', type: 'success' });
  };

  const handleAddResident = (newResident: Resident) => {
    // 1. Validation: Prevent duplicate emails (if email is set)
    const newEmail = newResident.email?.trim().toLowerCase();
    if (newEmail && newEmail !== "" && newEmail !== "não cadastrado") {
      const emailExists = residents.some(r => r.email?.trim().toLowerCase() === newEmail && !r.deleted_at);
      if (emailExists) {
        setToast({ message: 'Erro: Já existe um morador cadastrado com este e-mail.', type: 'info' });
        return;
      }
    }

    // 2. Validation: Prevent duplicate Name + Unit to avoid copy-pasting entries or double clicks
    const newName = newResident.name?.trim().toLowerCase();
    const newUnit = newResident.unit?.trim().toLowerCase();
    const nameUnitExists = residents.some(r => 
      r.name?.trim().toLowerCase() === newName && 
      r.unit?.trim().toLowerCase() === newUnit &&
      !r.deleted_at
    );
    if (nameUnitExists) {
      setToast({ message: 'Erro: Já existe um morador com este nome cadastrado nesta mesma unidade.', type: 'info' });
      return;
    }

    const updated = [newResident, ...residents];
    saveResidents(updated);
    addAuditLog('CREATE', 'Moradores', newResident.id, null, newResident);
    setToast({ message: 'Morador cadastrado com sucesso!', type: 'success' });
  };

  const handleUpdateResident = React.useCallback((updatedResident: Resident) => {
    const oldResident = residents.find(r => r.id === updatedResident.id);
    const updated = residents.map(r => 
      r.id === updatedResident.id ? updatedResident : r
    );
    saveResidents(updated);
    addAuditLog('UPDATE', 'Moradores', updatedResident.id, oldResident, updatedResident);

    // Also update if they are the currently simulated user!
    if (currentUser && currentUser.id === updatedResident.id) {
      const updatedUser = {
        id: updatedResident.id,
        name: updatedResident.name,
        unit: updatedResident.unit,
        role: updatedResident.role || 'Morador'
      };
      setCurrentUser(updatedUser);
    }

    setToast({ message: 'Dados do morador salvos com sucesso!', type: 'success' });
  }, [residents, currentUser, setCurrentUser]);

  // 3. Bookings Handlers
  const handleAddBooking = (newBooking: Booking) => {
    const updated = [newBooking, ...bookings];
    saveBookings(updated);
    addAuditLog('CREATE', 'Reservas', newBooking.id, null, newBooking);
    setToast({ message: 'Reserva cadastrada e salva com sucesso!', type: 'success' });
  };

  const handleCancelBooking = (id: string) => {
    const oldBooking = bookings.find(b => b.id === id);
    const updatedItem = oldBooking ? { ...oldBooking, status: 'Cancelado' as const } : null;
    const updated = bookings.map(b => 
      b.id === id ? updatedItem! : b
    );
    saveBookings(updated);
    if (oldBooking && updatedItem) {
      addAuditLog('UPDATE', 'Reservas', id, oldBooking, updatedItem);
    }
    setToast({ message: 'Reserva cancelada com sucesso!', type: 'success' });
  };

  const handleConfirmBooking = (id: string) => {
    const oldBooking = bookings.find(b => b.id === id);
    const updatedItem = oldBooking ? { ...oldBooking, status: 'Confirmado' as const } : null;
    const updated = bookings.map(b => 
      b.id === id ? updatedItem! : b
    );
    saveBookings(updated);
    if (oldBooking && updatedItem) {
      addAuditLog('UPDATE', 'Reservas', id, oldBooking, updatedItem);
    }
    setToast({ message: 'Reserva confirmada com sucesso!', type: 'success' });
  };

  const handleUpdateGuestStatus = (bookingId: string, guestIndex: number) => {
    const oldBooking = bookings.find(b => b.id === bookingId);
    let updatedItem: any = null;
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        const newGuests = [...b.guests];
        newGuests[guestIndex] = { ...newGuests[guestIndex], status: 'Liberado' };
        updatedItem = { ...b, guests: newGuests };
        return updatedItem;
      }
      return b;
    });
    saveBookings(updated);
    if (oldBooking && updatedItem) {
      addAuditLog('UPDATE', 'Reservas', bookingId, oldBooking, updatedItem);
    }
    setToast({ message: 'Acesso do convidado liberado com sucesso!', type: 'success' });
  };

  // 4. Announcements Handlers
  const handleAddAnnouncement = (newAnn: Announcement) => {
    const updated = [newAnn, ...announcements];
    saveAnnouncements(updated);
    addAuditLog('CREATE', 'Comunicados', newAnn.id, null, newAnn);
    setToast({ message: 'Novo comunicado publicado com sucesso!', type: 'success' });
  };

  const handleUpdateAnnouncement = (updatedAnn: Announcement) => {
    const oldAnnouncement = announcements.find(a => a.id === updatedAnn.id);
    const updated = announcements.map(a => a.id === updatedAnn.id ? updatedAnn : a);
    saveAnnouncements(updated);
    addAuditLog('UPDATE', 'Comunicados', updatedAnn.id, oldAnnouncement, updatedAnn);
    setToast({ message: 'Comunicado atualizado e salvo com sucesso!', type: 'success' });
  };

  // 5. Incidents Handlers
  const handleAddIncident = (newInc: Incident) => {
    const enrichedInc = {
      ...newInc,
      created_by: currentUser?.id && isValidUUID(currentUser.id) ? currentUser.id : null
    };
    const updated = [enrichedInc, ...incidents];
    saveIncidents(updated, enrichedInc);
    addAuditLog('CREATE', 'Ocorrências', enrichedInc.id, null, enrichedInc);
    setToast({ message: 'Ocorrência registrada com sucesso!', type: 'success' });
  };

  const handleAddIncidentReply = (incidentId: string, reply: IncidentReply) => {
    const oldIncident = incidents.find(i => i.id === incidentId);
    let updatedItem: any = null;
    const updated = incidents.map(inc => {
      if (inc.id === incidentId) {
        updatedItem = { ...inc, replies: [...inc.replies, reply] };
        return updatedItem;
      }
      return inc;
    });
    saveIncidents(updated, updatedItem);
    if (oldIncident && updatedItem) {
      addAuditLog('UPDATE', 'Ocorrências', incidentId, oldIncident, updatedItem);
    }
    setToast({ message: 'Mensagem de resposta enviada com sucesso!', type: 'success' });
  };

  const handleUpdateIncidentStatus = (incidentId: string, status: 'Aberto' | 'Em Andamento' | 'Resolvido') => {
    const oldIncident = incidents.find(i => i.id === incidentId);
    let updatedItem: any = null;
    const updated = incidents.map(inc => {
      if (inc.id === incidentId) {
        updatedItem = { ...inc, status };
        return updatedItem;
      }
      return inc;
    });
    saveIncidents(updated, updatedItem);
    if (oldIncident && updatedItem) {
      addAuditLog('UPDATE', 'Ocorrências', incidentId, oldIncident, updatedItem);
    }
    setToast({ message: `Status da ocorrência atualizado para "${status}" com sucesso!`, type: 'success' });
  };

  const handleUpdateIncident = (updatedIncident: Incident) => {
    const oldIncident = incidents.find(i => i.id === updatedIncident.id);
    const updated = incidents.map(inc => {
      if (inc.id === updatedIncident.id) {
        return updatedIncident;
      }
      return inc;
    });
    saveIncidents(updated, updatedIncident);
    if (oldIncident) {
      addAuditLog('UPDATE', 'Ocorrências', updatedIncident.id, oldIncident, updatedIncident);
    }
    setToast({ message: 'Ocorrência atualizada com sucesso!', type: 'success' });
  };

  const handleSaveIncidentCategories = (categoriesList: string[]) => {
    setIncidentCategories(categoriesList);
    addToSyncQueue('app_config', 'upsert', {
      key: 'incident_categories',
      value: JSON.stringify(categoriesList)
    });
    setToast({ message: 'Lista de categorias de ocorrências salva com sucesso!', type: 'success' });
  };

  useEffect(() => {
    let styleEl = document.getElementById('dynamic-theme-vars');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-theme-vars';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      :root {
        --app-bg: ${themeSettings.customBg} !important;
        --app-card-bg: ${themeSettings.customCardBg} !important;
        --app-text: ${themeSettings.customText} !important;
        --app-text-muted: ${themeSettings.customTextMuted} !important;
        --app-border: ${themeSettings.customBorder} !important;
        --app-accent: ${themeSettings.customAccent} !important;
        --app-accent-hover: ${themeSettings.customAccent}e0 !important;
      }
    `;
  }, [themeSettings]);

  const canAccess = (tab: 'dashboard' | 'visitors' | 'residents' | 'bookings' | 'announcements' | 'incidents' | 'encomendas' | 'audit_logs' | 'achados_perdidos') => {
    const role = currentUser.role || 'Morador';
    if (tab === 'audit_logs') {
      return role === 'MASTER' || role === 'Administrador';
    }
    if (role === 'MASTER') return true;
    if (role === 'Administrador') return true;
    if (role === 'Porteiro') {
      return ['dashboard', 'visitors', 'residents', 'incidents', 'encomendas', 'achados_perdidos', 'bookings'].includes(tab);
    }
    if (role === 'Morador') {
      return ['dashboard', 'bookings', 'announcements', 'incidents', 'encomendas', 'achados_perdidos'].includes(tab);
    }
    return false;
  };

  const myPendingEncomendas = currentUser?.role === 'Morador' ? encomendas.filter(enc => {
    const apt = enc.apartamento || '';
    const tower = enc.torre || '';
    const unit = currentUser.unit || '';
    return enc.status === 'Pendente' && 
      (enc.moradorId === currentUser.id || 
       (unit && (
         unit.toLowerCase().includes(apt.toLowerCase()) || 
         apt.toLowerCase().includes(unit.toLowerCase()) ||
         `${tower} - Apt ${apt}` === unit
       )));
  }) : [];


  if (showConfigOverlay) {
    return (
      <React.Suspense fallback={<div className="fixed inset-0 bg-neutral-950 text-white flex items-center justify-center font-mono">Carregando modulo...</div>}>
        <ConfigErrorOverlay 
          errors={envConfig.errors.length > 0 ? envConfig.errors : ['VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados.']} 
          onBypass={() => setBypassOverlay(true)}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 font-sans text-gray-800 flex flex-col" id="app-wrapper">
      
      
      {/* Administrator Lock Screen Overlay */}
      <AnimatePresence>
        {isPanelLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <React.Suspense fallback={<div className="fixed inset-0 bg-neutral-950 text-white flex flex-col items-center justify-center font-sans tracking-widest uppercase">Carregando bloqueio...</div>}>
              <AdminLockScreen 
                onUnlock={handleUnlockConsole} 
                operatorName={operatorName} 
                portName={portName} 
                operatorAvatarUrl={operatorAvatarUrl}
                appName={themeSettings.appName}
                residents={residents}
                loginCustomization={loginCustomization}
              />
            </React.Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Section */}
      <header className="bg-white border-b border-gray-150 sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand and Mobile Quick Settings */}
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-xl flex items-center justify-center min-w-[36px] min-h-[36px]">
                {themeSettings.logoUrl ? (
                  <img 
                    src={themeSettings.logoUrl} 
                    alt="Logo" 
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 object-contain rounded-xs" 
                  />
                ) : (
                  <>
                    {themeSettings.logoIcon === 'Shield' && <Shield className="w-5 h-5 text-white" />}
                    {themeSettings.logoIcon === 'Home' && <Home className="w-5 h-5 text-white" />}
                    {themeSettings.logoIcon === 'Key' && <Key className="w-5 h-5 text-white" />}
                    {themeSettings.logoIcon === 'Star' && <Star className="w-5 h-5 text-white" />}
                    {themeSettings.logoIcon === 'Layout' && <Layout className="w-5 h-5 text-white" />}
                    {themeSettings.logoIcon !== 'Shield' && 
                     themeSettings.logoIcon !== 'Home' && 
                     themeSettings.logoIcon !== 'Key' && 
                     themeSettings.logoIcon !== 'Star' && 
                     themeSettings.logoIcon !== 'Layout' && 
                     <Building2 className="w-5 h-5 text-white" />}
                  </>
                )}
              </div>
              <div>
                <h1 className="text-sm md:text-lg font-black text-slate-900 tracking-tight font-sans italic leading-none flex items-center gap-1">
                  {themeSettings.appName}
                </h1>
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-wider mt-1">{themeSettings.appSlogan}</p>
              </div>
            </div>

            {/* Mobile Actions Header Gear */}
            <div className="flex lg:hidden items-center gap-2">
              {currentUser.role !== 'Morador' && (
                <button
                  onClick={() => setIsQRScannerOpen(true)}
                  className="p-1.5 text-emerald-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl cursor-pointer transition-all"
                  title="Portaria Express 📸: Leitura de QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              )}
              {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER') && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl cursor-pointer transition-all"
                  title="Configurações de Administrador"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleSetPanelLockedState(true)}
                className="p-1.5 text-red-400 hover:text-red-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl cursor-pointer transition-all"
                title="Bloquear Terminal de Controle"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation links Tabs */}
          <nav className="flex flex-wrap gap-1 bg-gray-100/85 p-1 rounded-xl" id="main-navigation">
            {canAccess('dashboard') && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Painel Geral
              </button>
            )}
            {canAccess('visitors') && (
              <button
                onClick={() => setActiveTab('visitors')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'visitors'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Visitantes
              </button>
            )}
            {canAccess('residents') && (
              <button
                onClick={() => setActiveTab('residents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'residents'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Moradores
              </button>
            )}
            {canAccess('bookings') && (
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'bookings'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" /> Área de Lazer
              </button>
            )}
            {canAccess('announcements') && (
              <button
                onClick={() => setActiveTab('announcements')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'announcements'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" /> Mural Avisos
              </button>
            )}
            {canAccess('incidents') && (
              <button
                onClick={() => setActiveTab('incidents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'incidents'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Ocorrências
              </button>
            )}
            {canAccess('encomendas') && (
              <button
                onClick={() => setActiveTab('encomendas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'encomendas'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
                id="tab-button-encomendas"
              >
                <Package className="w-3.5 h-3.5" /> Encomendas
              </button>
            )}
            {canAccess('achados_perdidos') && (
              <button
                onClick={() => setActiveTab('achados_perdidos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'achados_perdidos'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
                id="tab-button-achados_perdidos"
              >
                <Award className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Achados e Perdidos
              </button>
            )}
            {canAccess('audit_logs') && (
              <button
                onClick={() => setActiveTab('audit_logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'audit_logs'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-gray-550 hover:text-slate-900 hover:bg-white/40'
                }`}
                id="tab-button-audit_logs"
              >
                <Shield className="w-3.5 h-3.5 text-blue-500" /> Auditoria Geral
              </button>
            )}
          </nav>

          {/* Operator Status Right Block from Bento Grid Theme */}
          <div className="hidden lg:flex items-center gap-4 border-l border-gray-150 pl-4 h-9">
            {/* Sync Status Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider select-none ${
                syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                syncStatus === 'syncing' ? 'bg-amber-50 text-amber-500 border border-amber-200 animate-pulse' :
                'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold'
              }`}
              title={
                syncStatus === 'synced'
                  ? realtimeActive
                    ? 'Conexão Realtime de Tempo Real ativa com o Supabase'
                    : 'Supabase conectado e sincronizado via Polling de 5s'
                  : syncStatus === 'syncing'
                  ? `Sincronizando dados pendentes... ${pendingSyncQueue.length} itens na fila`
                  : 'Erro ou lentidão de conexão com o Supabase. Aguardando re-tentativa (Modo Offline).'
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'synced' ? 'bg-emerald-500' :
                syncStatus === 'syncing' ? 'bg-amber-500 animate-ping' :
                'bg-rose-500 animate-pulse'
              }`} />
              <span>
                {syncStatus === 'synced'
                  ? realtimeActive
                    ? 'Tempo Real OK'
                    : 'Nuvem OK'
                  : syncStatus === 'syncing'
                  ? 'Salvando...'
                  : 'Sem Conexão'}
              </span>
            </div>

            {currentUser?.role === 'Morador' && myPendingEncomendas.length > 0 && (
              <button
                type="button"
                onClick={() => setIsMyPackagesOpen(true)}
                className="relative p-1.5 rounded-xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.65)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer group shrink-0"
                title="Você tem novas encomendas! Clique para ver os detalhes."
              >
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                  <span className="relative flex items-center justify-center rounded-full h-3.5 w-3.5 bg-yellow-400 text-[8px] font-black text-slate-900 font-mono">
                    {myPendingEncomendas.length}
                  </span>
                </span>
                <Package className="w-4 h-4 text-white animate-bounce" />
                <span className="text-[9.5px] font-black uppercase tracking-wider pr-1 select-none">
                  ENCOMENDA RECEBIDA!
                </span>
              </button>
            )}

            <div 
              onClick={() => {
                if (currentUser.role === 'Administrador' || currentUser.role === 'MASTER') {
                  setIsSettingsOpen(true);
                } else if (currentUser.role === 'Morador') {
                  setIsProfileModalOpen(true);
                } else {
                  alert(`Perfil conectado: ${currentUser.name} (${currentUser.role}). Unidade: ${currentUser.unit || 'Portaria/Painel Gp'}`);
                }
              }}
              className="flex items-center gap-3 hover:bg-gray-50 p-1 px-2.5 rounded-xl border border-transparent hover:border-gray-200 transition-all cursor-pointer select-none"
              title={currentUser.role === 'Administrador' || currentUser.role === 'MASTER' ? "Configurações do Painel" : "Seu Perfil Conectado"}
            >
              <div className="text-right">
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-wider leading-none">
                  {currentUser.unit ? `Unidade ${currentUser.unit}` : `${portName}`}
                </p>
                <div className="text-xs text-slate-800 font-extrabold mt-1 leading-none flex items-center gap-1 justify-end">
                  <span>{currentUser.name}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-bold text-white uppercase tracking-wider ${
                    currentUser.role === 'MASTER' ? 'bg-indigo-700 border border-indigo-500 font-black animate-pulse shadow-sm shadow-indigo-500/50' :
                    currentUser.role === 'Administrador' ? 'bg-rose-600' :
                    currentUser.role === 'Porteiro' ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
              {/* QR Code for Resident */}
              {currentUser.role === 'Morador' && residents.find(r => r.id === currentUser.id)?.qrCodeValue && (
                <div className="mr-1">
                   <ProceduralQRCode value={residents.find(r => r.id === currentUser.id)!.qrCodeValue!} size={32} />
                </div>
              )}
              {/* User Avatar - Conditional rendering with photo or initials */}
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white overflow-hidden flex items-center justify-center font-mono font-black text-[11px] tracking-tight leading-none uppercase shrink-0 border border-slate-700 shadow-xs">
                {(currentUser.role === 'Morador' ? residents.find(r => r.id === currentUser.id)?.avatarUrl : operatorAvatarUrl) ? (
                  <img 
                    src={currentUser.role === 'Morador' ? residents.find(r => r.id === currentUser.id)?.avatarUrl : operatorAvatarUrl} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  currentUser.name.split(' ').filter(n => !n.toLowerCase().startsWith('op.')).map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'US'
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-zinc-200 pl-3">
              {currentUser.role !== 'Morador' && (
                <button
                  onClick={() => setIsQRScannerOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-tr from-slate-900 to-slate-950 hover:bg-slate-800 text-white border border-zinc-700 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.03] active:scale-97 shadow-md"
                  title="Portaria Express 📸: Leitura de QR Code"
                  id="btn-header-portaria-express-scan"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" /> Portaria Express
                </button>
              )}

              {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER') && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 text-zinc-500 hover:text-slate-900 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
                  title="Configurações de Administrador"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleSetPanelLockedState(true)}
                className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                title="Sair do Perfil / Bloquear Console"
              >
                <Lock className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-tighter uppercase text-zinc-400">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Space wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <React.Suspense fallback={<LoadingSpinnerFallback />}>
          {activeTab === 'dashboard' && (
            <DashboardView 
              residents={activeResidents}
              visitors={activeVisitors}
              bookings={activeBookings}
              incidents={activeIncidents}
              commonAreas={activeCommonAreas}
              onCheckOutVisitor={handleCheckOutVisitor}
              currentUser={currentUser}
              encomendas={activeEncomendas}
              onlineResidentIds={onlineResidentIds}
              onToggleResidentOnline={handleToggleResidentOnline}
              onAddVisitor={handleAddVisitorFromResident}
              onTriggerCancela={triggerCancelaRelease}
              onOpenQRScanner={() => setIsQRScannerOpen(true)}
              themeSettings={themeSettings}
            />
          )}

          {activeTab === 'visitors' && (
            <VisitorsView 
              visitors={activeVisitors}
              residents={activeResidents}
              onAddVisitor={handleAddVisitor}
              onCheckOutVisitor={handleCheckOutVisitor}
              onUpdateVisitorStatus={handleUpdateVisitorStatus}
              onRemoveVisitor={handleRemoveVisitor}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'residents' && (
            <ResidentsView 
              residents={activeResidents}
              onAddResident={handleAddResident}
              onRemoveResident={handleRemoveResident}
              onUpdateResidentAvatar={handleUpdateResidentAvatar}
              onUpdateResident={handleUpdateResident}
              towerNames={themeSettings.towerNames || DEFAULT_THEME_SETTINGS.towerNames}
              currentUser={currentUser}
              onlineResidentIds={onlineResidentIds}
              onToggleResidentOnline={handleToggleResidentOnline}
              encomendas={activeEncomendas}
              onNavigate={(tab) => setActiveTab(tab)}
              condoName={themeSettings.appName || DEFAULT_THEME_SETTINGS.appName}
              isSyncing={syncStatus === 'syncing'}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingsView 
              bookings={activeBookings}
              residents={activeResidents}
              onAddBooking={handleAddBooking}
              onCancelBooking={handleCancelBooking}
              onConfirmBooking={handleConfirmBooking}
              onUpdateGuestStatus={handleUpdateGuestStatus}
              onDeleteBooking={handleRemoveBooking}
              commonAreas={activeCommonAreas}
              onSaveCommonArea={saveCommonArea}
              onDeleteCommonArea={deleteCommonArea}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'announcements' && (
            <AnnouncementsView 
              announcements={activeAnnouncements}
              onAddAnnouncement={handleAddAnnouncement}
              onUpdateAnnouncement={handleUpdateAnnouncement}
              onRemoveAnnouncement={handleRemoveAnnouncement}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentsView 
              incidents={activeIncidents}
              residents={activeResidents}
              onAddIncident={handleAddIncident}
              onAddIncidentReply={handleAddIncidentReply}
              onUpdateIncidentStatus={handleUpdateIncidentStatus}
              onRemoveIncident={handleRemoveIncident}
              onUpdateIncident={handleUpdateIncident}
              currentUser={currentUser}
              incidentCategories={incidentCategories}
              onSaveIncidentCategories={handleSaveIncidentCategories}
            />
          )}

          {activeTab === 'encomendas' && (
            <EncomendasView 
              encomendas={activeEncomendas}
              residents={activeResidents}
              onAddEncomenda={handleAddEncomenda}
              onDeliverEncomenda={handleDeliverEncomenda}
              onRemoveEncomenda={handleRemoveEncomenda}
              operatorName={operatorName}
              towerNames={themeSettings.towerNames}
              currentUser={currentUser}
              onOpenQRScanner={() => setIsQRScannerOpen(true)}
            />
          )}

          {activeTab === 'achados_perdidos' && (
            <AchadosPerdidosView 
              items={activeAchadosPerdidos}
              photos={achadosPerdidosFotos}
              history={achadosPerdidosHistorico}
              residents={activeResidents}
              operatorName={operatorName}
              currentUser={currentUser}
              onAddItem={handleAddAchadosPerdidos}
              onUpdateItem={handleUpdateAchadosPerdidos}
              onRemoveItem={handleRemoveAchadosPerdidos}
              onAddFoto={(foto) => setAchadosPerdidosFotos(prev => [foto, ...prev])}
              onRemoveFoto={(id) => setAchadosPerdidosFotos(prev => prev.filter(p => p.id !== id))}
            />
          )}

          {activeTab === 'audit_logs' && (
            <AuditLogDashboard 
              auditLogs={auditLogs}
              onClearLogs={() => setAuditLogs([])}
              onRestoreFromLog={handleRestoreFromAuditLog}
              deletedItems={{
                residents: residents.filter(r => r.deleted_at),
                visitors: visitors.filter(v => v.deleted_at),
                bookings: bookings.filter(b => b.deleted_at),
                announcements: announcements.filter(a => a.deleted_at),
                incidents: incidents.filter(i => i.deleted_at),
                encomendas: encomendas.filter(e => e?.deleted_at),
                'Achados e Perdidos': achadosPerdidos.filter(a => a.deleted_at)
              }}
              onRestoreItem={handleRestoreDeletedItem}
              currentUser={currentUser}
              retentionDays={retentionDays}
              onUpdateRetentionDays={(days) => setRetentionDays(days)}
            />
          )}
        </React.Suspense>
      </main>

      {/* Footer information section */}
      <footer className="bg-white border-t border-gray-150 py-6 text-center select-none mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 gap-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{themeSettings.appName} Condomínio Inteligente - Eclusas Monitoradas 24h</span>
          </div>
          <div>
            <span>Desenvolvido com Tecnologia IA Gemini - Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

      {/* Admin Settings Modal */}
      <React.Suspense fallback={null}>
        <AdminSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          adminPasswordCurrent={adminPassword}
          onSavePassword={handleSavePassword}
          operatorNameCurrent={operatorName}
          portNameCurrent={portName}
          operatorAvatarUrlCurrent={operatorAvatarUrl}
          onSaveOperator={handleSaveOperatorDetails}
          onLockPanel={() => handleSetPanelLockedState(true)}
          themeSettingsCurrent={themeSettings}
          onSaveThemeSettings={handleSaveThemeSettings}
          syncLogs={syncLogs}
          loginCustomizationCurrent={loginCustomization}
          onSaveLoginCustomization={handleSaveLoginCustomization}
        />
      </React.Suspense>

      {/* Theme and Visual Color Customizer Drawer */}
      <React.Suspense fallback={null}>
        <ThemeCustomizerDrawer
          isOpen={isThemeDrawerOpen}
          onClose={() => setIsThemeDrawerOpen(false)}
          themeSettings={themeSettings}
          onSaveThemeSettings={handleSaveThemeSettings}
        />
      </React.Suspense>

      {/* Resident Profile Modal */}
      <ResidentProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        resident={currentUser.role === 'Morador' ? residents.find(r => r.id === currentUser.id) || null : null}
        onSave={handleUpdateResident}
      />
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* CANCELA LIBERADA OVERLAY MODAL */}
      <AnimatePresence>
        {cancelaReleaseActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="max-w-md w-full animate-cancela-pulsante rounded-3xl p-8 text-center shadow-2xl border-4 text-white space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto border-2 border-emerald-300">
                <Unlock className="w-10 h-10 text-emerald-300 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-wider text-white">
                  {cancelaReleaseType === 'visitor' ? 'Visitante Liberado!' : 'Encomenda Entregue!'}
                </h2>
                <div className="h-1 w-24 bg-emerald-400 mx-auto rounded-full" />
                <p className="text-xs uppercase font-extrabold tracking-widest text-emerald-200 font-mono mt-2 animate-pulse">
                  Acesso Autorizado
                </p>
              </div>

              <div className="bg-black/20 p-4 rounded-2xl border border-white/10 text-left space-y-2">
                <p className="text-[10px] uppercase text-emerald-300 tracking-wider font-extrabold leading-none">
                  Controle de Portaria Inteligente
                </p>
                {cancelaReleasePlate && (
                  <div className="py-4 flex justify-center">
                    <div className="p-2 bg-white/20 rounded-xl shadow-2xl border border-white/30 transform scale-150">
                      <MercosulPlate plate={cancelaReleasePlate} />
                    </div>
                  </div>
                )}
                <div className="text-xs font-semibold truncate text-white">
                  Destino / Alvo: <span className="text-emerald-300 font-black">{cancelaReleaseName}</span>
                </div>
                <div className="text-[10px] text-emerald-300/80 leading-snug">
                  Os solenoides do motor físico foram disparados. A cancela fechará automaticamente após a passagem do veículo e leitura do laço indutivo.
                </div>
              </div>

              <button
                onClick={() => setCancelaReleaseActive(false)}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 border border-emerald-600 rounded-lg text-xs font-bold uppercase transition-all tracking-wide cursor-pointer w-full text-white"
              >
                Ignorar Aviso
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentModalAnnouncement && (
        <AnnouncementModal
          announcement={currentModalAnnouncement}
          onClose={() => setCurrentModalAnnouncement(null)}
          onConfirm={handleConfirmAnnouncement}
        />
      )}

      {/* Real-Time Package Insertion Toast Alert */}
      <AnimatePresence>
        {activePackageToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed top-1 md:top-24 inset-x-2 md:inset-x-auto md:right-5 z-[9999999] md:max-w-sm w-full md:w-auto bg-slate-950 border-2 border-rose-500 rounded-2xl p-4 shadow-[0_0_50px_rgba(244,63,94,0.6)] flex gap-3 text-white overflow-hidden pointer-events-auto"
          >
            {/* Pulsating colorful halo */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-linear-to-b from-rose-600 via-orange-500 to-amber-500 animate-pulse" />
            
            <div className="bg-gradient-to-br from-rose-500 to-orange-500 p-2.5 rounded-xl text-white shrink-0 flex items-center justify-center relative w-11 h-11 self-start shadow-[0_0_12px_rgba(244,63,94,0.6)]">
              <span className="w-full h-full bg-white opacity-20 rounded-full animate-ping absolute"></span>
              <Package className="w-5 h-5 text-white animate-bounce" />
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <span className="text-[9px] bg-linear-to-r from-rose-500 to-orange-500 font-extrabold px-1.5 py-0.5 rounded text-white uppercase tracking-wider block w-fit mb-1 select-none">
                Notificação Instantânea
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider leading-snug text-white">
                Nova Encomenda Recebida
              </h4>
              <p className="text-[11px] text-zinc-350 leading-normal mt-1">
                Destino: Unidade <strong>{activePackageToast.torre} - {activePackageToast.apartamento}</strong> ({activePackageToast.moradorNome}).
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    // Switch to encomendas tab and select it
                    setActiveTab('encomendas');
                    setActivePackageToast(null);
                  }}
                  className="bg-white hover:bg-zinc-100 text-slate-950 font-extrabold text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  Ver Painel Código
                </button>
                <button
                  onClick={() => setActivePackageToast(null)}
                  className="text-zinc-400 hover:text-white font-bold text-[9px] uppercase transition-all tracking-wider px-2 py-1 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            <button
              onClick={() => setActivePackageToast(null)}
              className="absolute top-2.5 right-2 text-zinc-400 hover:text-white font-black cursor-pointer bg-white/5 hover:bg-white/10 rounded-full p-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resident Package Central Modal */}
      <AnimatePresence>
        {isMyPackagesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-white rounded-3xl border border-gray-150 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header with gradient of glowing colors */}
              <div className="bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 p-6 text-white relative">
                <button
                  onClick={() => setIsMyPackagesOpen(false)}
                  className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-1.5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="bg-yellow-450 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest block w-fit mb-1 select-none">
                  Morador Conectado
                </span>
                <h3 className="text-xl font-black uppercase tracking-wider font-mono">
                  Suas Encomendas na Portaria
                </h3>
                <p className="text-xs text-rose-50 mt-1 leading-normal">
                  Informe o código de rastreio ou o seu nome na portaria para realizar a retirada física segura na guarita do condomínio.
                </p>
              </div>

              {/* Scrollable list of pending and delivered packages */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {myPendingEncomendas.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-150 flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold uppercase text-slate-800">Tudo em dia!</h4>
                    <p className="text-xs text-zinc-400">Você não possui nenhuma encomenda aguardando retirada no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myPendingEncomendas.map((enc) => (
                      <div 
                        key={enc.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md uppercase">
                              {enc.codigoRastreio}
                            </span>
                            <span className="text-[10px] bg-amber-50 border border-amber-250 text-amber-700 font-extrabold px-1.5 py-0.5 rounded-md uppercase flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                              Aguardando
                            </span>
                          </div>
                          
                          <div className="text-xs text-slate-700 space-y-1 font-medium leading-relaxed">
                            <p><strong>Unidade:</strong> {enc.torre} - Apt {enc.apartamento}</p>
                            <p><strong>Quem recebe:</strong> {enc.moradorNome}</p>
                            <p><strong>Cadastrado em:</strong> {new Date(enc.dataRecebimento).toLocaleString('pt-BR')}</p>
                            <p><strong>Responsável:</strong> {enc.responsavelRecebimento}</p>
                            {enc.observacoes && (
                              <p className="bg-white p-2 rounded-lg border border-gray-150 text-[11px] text-zinc-500 font-normal italic mt-1.5">
                                "{enc.observacoes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 md:text-right">
                          <ProceduralQRCode value={enc.qrCodeValue || enc.codigoRastreio || ''} size={120} />
                          <p className="text-[10px] text-zinc-400 mt-1 font-mono">{enc.qrCodeValue}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close footer interaction */}
              <div className="bg-gray-50/50 p-4 border-t border-gray-150 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsMyPackagesOpen(false)}
                  className="bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  Confirmar e Fechar Perfil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Portaria Express QR Scanner HUD */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

    </div>
  );
}

