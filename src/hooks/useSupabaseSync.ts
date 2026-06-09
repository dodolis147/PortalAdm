import { useState, useEffect } from 'react';
import { Repository } from '../lib/db-client';

export function useSupabaseSync<T extends { id: string }>(repository: Repository<T>) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    repository.findAll().then(setData).catch(console.error);
    
    const unsubscribe = repository.subscribe((updatedItem, event) => {
      setData(prev => {
        // Encomenda interface has id: string now, so T should satisfy it
        const item = updatedItem as T;
        if (event === 'INSERT') return [...prev, item];
        if (event === 'UPDATE') return prev.map(oldItem => (oldItem as any).id === (item as any).id ? item : oldItem);
        if (event === 'DELETE') return prev.filter(oldItem => (oldItem as any).id !== (updatedItem as any).id);
        return prev;
      });
    });

    return () => unsubscribe();
  }, [repository]);

  return [data, setData] as const;
}
