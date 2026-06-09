
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { useDexiePersistence } from '../lib/db';
import { PendingSyncItem } from '../types'; // Need to make sure this exists

export function useSyncEngine() {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [pendingSyncQueue, setPendingSyncQueue] = useDexiePersistence<PendingSyncItem[]>('pendingSyncQueue', []);
  const pendingSyncQueueRef = useRef<PendingSyncItem[]>([]);
  const syncInProgressRef = useRef<boolean>(false);
  const syncTriggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    pendingSyncQueueRef.current = pendingSyncQueue;
  }, [pendingSyncQueue]);

  // Sync logic moved from App.tsx ...
  
  return {
    syncStatus,
    pendingSyncQueue,
    setPendingSyncQueue,
    syncInProgressRef,
    syncTriggerRef
  };
}
