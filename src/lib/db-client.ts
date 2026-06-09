import { supabase } from './supabase';
import { toCamelCase, toSnakeCase } from './utils';

export interface Repository<T> {
  findAll: () => Promise<T[]>;
  findById: (id: string) => Promise<T | null>;
  upsert: (item: T) => Promise<T>;
  delete: (id: string) => Promise<void>;
  subscribe: (onUpdate: (data: T, type: 'INSERT' | 'UPDATE' | 'DELETE') => void) => () => void;
  getLocalCache?: () => T[];
}

const VALID_DB_COLUMN_MAP: Record<string, string[]> = {
  residents: [
    'id', 'name', 'unit', 'phone', 'email', 'vehicles', 'members', 'status', 'avatar_url', 'role', 'password', 'biometrics_active', 'created_at', 'updated_at', 'created_by', 'active'
  ],
  visitors: [
    'id', 'name', 'document', 'phone', 'type', 'unit_to_visit', 'resident_id', 'host_name', 'company', 'vehicle_plate', 'entry_time', 'exit_time', 'status', 'exit_code', 'notes', 'expiration_time', 'created_at', 'updated_at', 'validity_duration', 'auto_released', 'created_by', 'active'
  ],
  common_areas: [
    'id', 'name', 'capacity', 'description', 'rules', 'price', 'photo_url', 'created_at', 'updated_at', 'created_by', 'active'
  ],
  bookings: [
    'id', 'area_id', 'unit', 'resident_name', 'resident_id', 'date', 'start_time', 'end_time', 'status', 'guests_count', 'guests', 'created_at', 'updated_at', 'created_by', 'active'
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
  theme_settings: [
    'id', 'app_name', 'app_slogan', 'logo_url', 'logo_icon', 'preset_id', 'custom_bg', 'custom_card_bg', 'custom_text', 'custom_text_muted', 'custom_border', 'custom_accent', 'tower_names', 'created_at', 'updated_at', 'created_by', 'active'
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

export function createRepository<T>(table: string): Repository<T> {
  const isServer = typeof window === 'undefined';
  let cachedItems: T[] | null = null;

  const getLocalCache = (): T[] => {
    if (isServer) return [];
    if (cachedItems !== null) return cachedItems;
    try {
      let value = localStorage.getItem(`condoaccess_cache_${table}`);
      if (!value) {
        value = localStorage.getItem(table);
      }
      cachedItems = value ? JSON.parse(value) : [];
      return cachedItems!;
    } catch (e) {
      console.warn(`[LOCAL_CACHE] Cannot read local cache for ${table}:`, e);
      return [];
    }
  };

  const saveLocalCache = (items: T[]) => {
    if (isServer) return;
    cachedItems = items;
    try {
      localStorage.setItem(`condoaccess_cache_${table}`, JSON.stringify(items));
      localStorage.setItem(table, JSON.stringify(items));

      // Async backing write to Dexie IndexedDB
      import('./db').then(({ getTableForStore }) => {
        const dexieTable = getTableForStore(table);
        if (dexieTable) {
          dexieTable.clear().then(() => {
            dexieTable.bulkPut(items).then(() => {
              console.log(`[LOCAL_CACHE - DEXIE] Dexie cache synced successfully for ${table}`);
            }).catch(err => {
              console.warn(`[LOCAL_CACHE - DEXIE] bulkPut error on ${table}:`, err);
            });
          }).catch(err => {
            console.warn(`[LOCAL_CACHE - DEXIE] clear error on ${table}:`, err);
          });
        }
      }).catch(() => {
        // Safe to ignore on initial load/ssr
      });
    } catch (e) {
      console.warn(`[LOCAL_CACHE] Cannot save local cache for ${table}:`, e);
    }
  };

  const isMissingTableError = (error: any) => {
    if (!error) return false;
    const errMsg = typeof error === 'string' ? error : (error?.message || '');
    const errCode = error?.code || '';
    return (
      errCode === '42P01' || 
      errCode === 'PGRST205' || 
      errMsg.toLowerCase().includes('relation') || 
      errMsg.toLowerCase().includes('exist') ||
      errMsg.toLowerCase().includes('schema cache') ||
      errMsg.toLowerCase().includes('could not find')
    );
  };

  const isNetworkError = (error: any) => {
    if (!error) return false;
    const errMsg = typeof error === 'string' ? error : (error?.message || '');
    return errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('network');
  };

  return {
    findAll: async () => {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          if (isMissingTableError(error) || isNetworkError(error)) {
            console.warn(`[SUPABASE_CLIENT_FALLBACK] Table "${table}" does not exist in Supabase yet. Returning local cache.`);
            return getLocalCache();
          }
          throw error;
        }
        const parsed = (data as any[]).map(item => toCamelCase(item)) as T[];
        saveLocalCache(parsed);
        return parsed;
      } catch (err: any) {
        if (isMissingTableError(err) || isNetworkError(err)) {
          console.warn(`[SUPABASE_CLIENT_FALLBACK] Table "${table}" exception or connection issue. Returning local cache.`, err);
          return getLocalCache();
        }
        throw err;
      }
    },
    findById: async (id: string) => {
      try {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (error) {
          if (isMissingTableError(error) || isNetworkError(error)) {
            return getLocalCache().find((item: any) => item.id === id) || null;
          }
          throw error;
        }
        return data ? toCamelCase(data) as T : null;
      } catch (err: any) {
        if (isMissingTableError(err) || isNetworkError(err)) {
          return getLocalCache().find((item: any) => item.id === id) || null;
        }
        throw err;
      }
    },
    upsert: async (item: T) => {
      const id = (item as any).id;
      
      // Save locally first for robust offline-first caching
      const localItems = getLocalCache();
      const existingIdx = localItems.findIndex((i: any) => i.id === id);
      if (existingIdx !== -1) {
        localItems[existingIdx] = item;
      } else {
        localItems.push(item);
      }
      saveLocalCache(localItems);

      try {
        let snakeItem = toSnakeCase(item);
        const allowedCols = VALID_DB_COLUMN_MAP[table];
        if (allowedCols && typeof snakeItem === 'object' && snakeItem !== null) {
          const cleaned: any = {};
          allowedCols.forEach((col: string) => {
            if (col in snakeItem) {
              cleaned[col] = snakeItem[col];
            }
          });
          snakeItem = cleaned;
        }

        const { data, error } = await supabase.from(table).upsert(snakeItem).select().single();
        if (error) {
          if (isMissingTableError(error) || isNetworkError(error)) {
            console.warn(`[SUPABASE_CLIENT_FALLBACK] Table "${table}" does not exist in Supabase. Row saved in local cache only.`, error);
            return item;
          }
          throw error;
        }
        
        const returnedItem = toCamelCase(data) as T;
        // Update local cache with official server response database defaults/triggers
        const updatedLocal = getLocalCache();
        const idx = updatedLocal.findIndex((i: any) => i.id === (returnedItem as any).id);
        if (idx !== -1) {
          updatedLocal[idx] = returnedItem;
        } else {
          updatedLocal.push(returnedItem);
        }
        saveLocalCache(updatedLocal);
        
        return returnedItem;
      } catch (err: any) {
        if (isMissingTableError(err) || isNetworkError(err)) {
          console.warn(`[SUPABASE_CLIENT_FALLBACK] Offline or table missing during upsert for "${table}". Saved to local cache.`, err);
          return item;
        }
        throw err;
      }
    },
    delete: async (id: string) => {
      const localItems = getLocalCache().filter((i: any) => i.id !== id);
      saveLocalCache(localItems);

      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
          if (isMissingTableError(error) || isNetworkError(error)) {
            console.warn(`[SUPABASE_CLIENT_FALLBACK] Table "${table}" does not exist in Supabase. Removed from local cache.`);
            return;
          }
          throw error;
        }
      } catch (err: any) {
        if (isMissingTableError(err) || isNetworkError(err)) {
          console.warn(`[SUPABASE_CLIENT_FALLBACK] Offline/missing table delete exception for "${table}". Removed locally.`, err);
          return;
        }
        throw err;
      }
    },
    subscribe: (onUpdate) => {
      const channel = supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload: any) => {
          if (payload.eventType === 'DELETE') {
            onUpdate(payload.old, 'DELETE');
          } else {
            onUpdate(toCamelCase(payload.new), payload.eventType as 'INSERT' | 'UPDATE');
          }
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
    getLocalCache
  };
}
