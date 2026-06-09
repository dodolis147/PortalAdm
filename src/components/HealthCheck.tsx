
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const HealthCheckComponent: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    async function checkHealth() {
      try {
        // Query a lightweight table (e.g., residents)
        const { error } = await supabase.from('residents').select('id').limit(1);
        if (error) {
          console.error('[HealthCheck] Database connection error:', error);
          setStatus('disconnected');
        } else {
          console.log('[HealthCheck] Database connection stable.');
          setStatus('connected');
        }
      } catch (err) {
        console.error('[HealthCheck] Unexpected health error:', err);
        setStatus('disconnected');
      }
    }

    checkHealth();
    
    // Interval for health check
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return null; // Silent component
};
