import { createRepository } from '../lib/db-client';
import { AuditLog } from '../types';
import { supabase } from '../lib/supabase';

export const auditLogsRepository = createRepository<AuditLog>('audit_logs');

export async function pruneOldAuditLogs() {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { error } = await supabase
    .from('audit_logs')
    .delete()
    .lt('created_at', threeMonthsAgo.toISOString());
    
  if (error) {
    console.error('Error pruning old logs:', error);
    throw error;
  }
}
