import Dexie, { type Table } from 'dexie';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Resident, Visitor, Booking, Announcement, Incident, Encomenda, 
  CommonArea, AuditLog, AchadosPerdidos, AchadosPerdidosFoto, 
  AchadosPerdidosHistorico, ThemeSettings, LoginCustomization 
} from '../types';

export interface PendingSyncItem {
  id: string;
  table: string;
  action: 'upsert' | 'delete';
  data: any;
  retries?: number;
}

export interface SyncLogItem {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'warning';
  msg: string;
}

class CondoAccessDatabase extends Dexie {
  residents!: Table<Resident, string>;
  visitors!: Table<Visitor, string>;
  bookings!: Table<Booking, string>;
  announcements!: Table<Announcement, string>;
  incidents!: Table<Incident, string>;
  encomendas!: Table<Encomenda, string>;
  commonAreas!: Table<CommonArea, string>;
  achadosPerdidos!: Table<AchadosPerdidos, string>;
  achadosPerdidosFotos!: Table<AchadosPerdidosFoto, string>;
  achadosPerdidosHistorico!: Table<AchadosPerdidosHistorico, string>;
  auditLogs!: Table<AuditLog, string>;
  pendingSyncQueue!: Table<PendingSyncItem, string>;
  syncLogs!: Table<SyncLogItem, string>;
  loginCustomization!: Table<LoginCustomization, string>;
  themeSettings!: Table<ThemeSettings, string>;

  constructor() {
    super('CondoAccessDatabase_v3');
    this.version(1).stores({
      residents: 'id, name, unit, status',
      visitors: 'id, name, document, type, status',
      bookings: 'id, areaId, unit, date',
      announcements: 'id, category, date',
      incidents: 'id, status, category, date',
      encomendas: 'id, codigoRastreio, status, apartamento',
      commonAreas: 'id, status',
      achadosPerdidos: 'id, status, categoria',
      achadosPerdidosFotos: 'id, objeto_id',
      achadosPerdidosHistorico: 'id, objeto_id',
      auditLogs: 'id, created_at, user_id, action, module',
      pendingSyncQueue: 'id, table, action',
      syncLogs: 'id, timestamp, type',
      loginCustomization: 'id',
      themeSettings: 'id'
    });
  }
}

export const db = new CondoAccessDatabase();

/**
 * Returns the corresponding Dexie Table given a state persistence key or database table name.
 */
export function getTableForStore(key: string): Table<any, string> | null {
  const map: Record<string, Table<any, string>> = {
    // State keys (used in useDexiePersistence)
    residents: db.residents,
    encomendas: db.encomendas,
    visitors: db.visitors,
    bookings: db.bookings,
    commonAreas: db.commonAreas,
    announcements: db.announcements,
    incidents: db.incidents,
    achadosPerdidos: db.achadosPerdidos,
    achadosPerdidosFotos: db.achadosPerdidosFotos,
    achadosPerdidosHistorico: db.achadosPerdidosHistorico,
    auditLogs: db.auditLogs,
    pendingSyncQueue: db.pendingSyncQueue,
    syncLogs: db.syncLogs,
    loginCustomization: db.loginCustomization,
    login_customization: db.loginCustomization,
    themeSettings: db.themeSettings,
    theme_settings: db.themeSettings,
    
    // Database Table keys (used in resilientQuery etc)
    common_areas: db.commonAreas,
    achados_perdidos: db.achadosPerdidos,
    achados_perdidos_fotos: db.achadosPerdidosFotos,
    achados_perdidos_historico: db.achadosPerdidosHistorico,
    audit_logs: db.auditLogs,
  };
  return map[key] || null;
}

/**
 * A drop-in hook that mimics useLocalStoragePersistence but targets Dexie (IndexedDB)
 * for large data entities, keeping React state in complete sync asynchronously.
 */
export function useDexiePersistence<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Initial async read from Dexie and sync with Supabase
  useEffect(() => {
    let active = true;
    const table = getTableForStore(key);
    
    // Helper to sync Supabase to Dexie if needed
    const syncDbToDexie = async () => {
      try {
        const repo = getTableForStore(key);
        // Only if it's a critical configuration table
        if (key === 'loginCustomization' || key === 'login_customization' || key === 'themeSettings' || key === 'theme_settings') {
          const { data } = await supabase.from(key.includes('login') ? 'login_customization' : 'theme_settings').select('*').eq('id', 'active').maybeSingle();
          if (data && table) {
            await table.put(data); // Sync local with remote
          }
        }
      } catch (e) {
        console.error(`[Dexie Sync] Failed to sync remote for key ${key}:`, e);
      }
    };

    if (!table) {
      // Fallback for smaller keys that don't match IndexedDB tables
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setState(JSON.parse(saved));
        } catch (e) {
          console.error(`[Dexie Fallback] Error parsing localStorage for key '${key}':`, e);
        }
      }
      setIsLoaded(true);
      return;
    }

    // Attempt sync before reading from local Dexie
    syncDbToDexie().then(() => {
      table.toArray()
        .then((items) => {
          if (!active) return;
          if (items && items.length > 0) {
            if (Array.isArray(defaultValue)) {
              setState(items as unknown as T);
            } else {
              setState(items[0] as unknown as T);
            }
          } else {
            // No values found in local DB, fallback to default value
            setState(defaultValue);
          }
          setIsLoaded(true);
        })
        .catch((err) => {
          console.error(`[Dexie Read Error] Failed to read table for key '${key}':`, err);
          if (active) {
            setState(defaultValue);
            setIsLoaded(true);
          }
        });
    });

    return () => {
      active = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Synchronize state changes back to Dexie
  useEffect(() => {
    // Only persist if we have finished our initial loading phase
    if (!isLoaded) return;

    const table = getTableForStore(key);
    if (!table) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.error(`[Dexie Fallback Error] Failed to write localStorage for key '${key}':`, e);
      }
      return;
    }

    const saveToDexie = async () => {
      try {
        const primKey = table.schema.primKey?.name || 'id';

        if (Array.isArray(state)) {
          // Robust sanitation of arrays before writing to prevent KeyPath Evaluation Failures
          const sanitized: any[] = [];
          let correctionsCount = 0;

          for (const item of state) {
            if (item && typeof item === 'object') {
              if (item[primKey] === undefined || item[primKey] === null || item[primKey] === '') {
                const correctedItem = { ...item };
                const generatedId = (key === 'themeSettings' || key === 'loginCustomization' || key === 'theme_settings' || key === 'login_customization')
                  ? 'active'
                  : crypto.randomUUID();
                correctedItem[primKey] = generatedId;
                sanitized.push(correctedItem);
                correctionsCount++;
                console.warn(`[Dexie Preventative Audit] Primary key '${primKey}' was missing in table/store '${key}'. Auto-repaired value to: '${generatedId}'`);
              } else {
                sanitized.push(item);
              }
            }
          }

          await table.clear();
          if (sanitized.length > 0) {
            await table.bulkPut(sanitized);
            if (correctionsCount > 0) {
              console.log(`[Dexie Preventative Audit] bulkPut successfully completed on table/store '${key}'. Total items: ${sanitized.length} (${correctionsCount} entries dynamically normalized and saved).`);
            }
          }
        } else if (state !== undefined && state !== null) {
          // Robust sanitation of single records before writing to prevent KeyPath Evaluation Failures
          let sanitized: any = state;
          if (typeof state === 'object') {
            const obj = state as any;
            if (obj[primKey] === undefined || obj[primKey] === null || obj[primKey] === '') {
              const generatedId = (key === 'themeSettings' || key === 'loginCustomization' || key === 'theme_settings' || key === 'login_customization')
                ? 'active'
                : crypto.randomUUID();

              sanitized = { ...obj };
              sanitized[primKey] = generatedId;

              console.warn(`[Dexie Preventative Audit] Individual entry for table/store '${key}' lacked the required primary key '${primKey}'. Auto-patched to: '${generatedId}'. Original object:`, state);
            }
          }

          await table.put(sanitized);
        } else {
          await table.clear();
        }
      } catch (err) {
        console.error(`[Dexie Write Error] Critical error during write execution to table/store '${key}':`, err);
      }
    };

    saveToDexie();
  }, [key, state, isLoaded]);

  return [state, setState, isLoaded];
}
