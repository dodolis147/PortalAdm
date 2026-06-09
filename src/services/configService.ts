import { createRepository } from '../lib/db-client';
import { LoginCustomization, ThemeSettings } from '../types';
import { supabase } from '../lib/supabase';

// Repository instances
export const loginCustomizationRepo = createRepository<LoginCustomization>('login_customization');
export const themeSettingsRepo = createRepository<ThemeSettings>('theme_settings');

/**
 * Service to manage configuration with durability and integrity.
 */
export const ConfigService = {
  // --- Login Customization ---
  getLoginCustomization: async (): Promise<LoginCustomization | null> => {
    try {
      // Always try fetching latest from Supabase (Source of Truth)
      const data = await loginCustomizationRepo.findById('active');
      return data;
    } catch (error) {
      console.error("[ConfigService] Error fetching login customization:", error);
      return null;
    }
  },

  updateLoginCustomization: async (config: LoginCustomization): Promise<LoginCustomization> => {
    // Basic structural integrity check
    if (!config.id) config.id = 'active';
    
    // Upsert to Supabase
    return await loginCustomizationRepo.upsert(config);
  },

  // --- Theme Settings ---
  getThemeSettings: async (): Promise<ThemeSettings | null> => {
    try {
      const data = await themeSettingsRepo.findById('active');
      return data;
    } catch (error) {
      console.error("[ConfigService] Error fetching theme settings:", error);
      return null;
    }
  },

  updateThemeSettings: async (settings: ThemeSettings): Promise<ThemeSettings> => {
    if (!settings.id) settings.id = 'active';
    return await themeSettingsRepo.upsert(settings);
  }
};
