-- Audit Logs table (system events and user actions)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "audit_logs_insert_authenticated" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "audit_logs_delete_admin" ON audit_logs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );