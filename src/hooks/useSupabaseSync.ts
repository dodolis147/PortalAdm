import { useState, useEffect } from 'react';
import { Repository } from '../lib/db-client';

export function useSupabaseSync<T extends { id: string }>(repository: Repository<T>) {
  const [data, setData] = useState<T[]>(() => {
    if (repository.getLocalCache) {
      try {
        return repository.getLocalCache();
      } catch (e) {
        console.warn("[useSupabaseSync] Initial cache retrieval failed:", e);
      }
    }
    return [];
  });

  useEffect(() => {
    repository.findAll().then(setData).catch(console.error);
  }, [repository]);

  return [data, setData] as const;
}
