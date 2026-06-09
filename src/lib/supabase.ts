import { createClient } from '@supabase/supabase-js';
import { getConfig } from './config';
import { AppConfigError } from '../types';

export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    if (!target._client) {
      const config = getConfig();
      if (!config.supabaseConfigured) {
        throw new AppConfigError(`[Supabase Error] Initialization failed: ${config.errors.join(", ")}`);
      }
      target._client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return target._client[prop];
  }
});
