-- Table definition for Audit Logs & User Action Trackings
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id TEXT,
    user_name TEXT,
    action TEXT,
    module TEXT,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    error_message TEXT,
    stack_trace TEXT,
    restored_by TEXT,
    restored_at TIMESTAMP WITH TIME ZONE
);

-- Performance Indexing as requested
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Select policy: Only Administrador/MASTER accounts or authenticated superusers can view/export logs
CREATE POLICY "Only administrators can view audit logs"
ON audit_logs
FOR SELECT
USING (
    -- If using custom JWT metadata or user_role claims
    coalesce(auth.jwt() ->> 'role', '') IN ('MASTER', 'Administrador')
);

-- Insert policy: All authenticated clients / actions can insert audit records
CREATE POLICY "Everyone can write audit logs"
ON audit_logs
FOR INSERT
WITH CHECK (true);
