-- Donor Indications table (when a donor indicates a family)
CREATE TABLE donor_indications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_name TEXT NOT NULL,
  region TEXT NOT NULL,
  children_count INTEGER DEFAULT 0,
  observation TEXT,
  contact TEXT,
  indicated_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE donor_indications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for donor_indications
CREATE POLICY "indications_select_own" ON donor_indications FOR SELECT
  TO authenticated USING (
    indicated_by_user_id::text = auth.uid()::text 
    OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'entity'))
  );

CREATE POLICY "indications_insert_own" ON donor_indications FOR INSERT
  TO authenticated WITH CHECK (indicated_by_user_id::text = auth.uid()::text);

CREATE POLICY "indications_update_entity" ON donor_indications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'entity'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'entity'))
  );

CREATE POLICY "indications_delete_admin" ON donor_indications FOR DELETE
  TO authenticated USING (
    indicated_by_user_id::text = auth.uid()::text 
    OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );