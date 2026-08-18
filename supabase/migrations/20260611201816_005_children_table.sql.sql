-- Children table (linked to families)
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  school TEXT,
  grade TEXT,
  is_pwd BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- RLS Policies for children
CREATE POLICY "children_select_all" ON children FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "children_insert_entity" ON children FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('entity', 'admin'))
  );

CREATE POLICY "children_update_entity" ON children FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('entity', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('entity', 'admin'))
  );

CREATE POLICY "children_delete_admin" ON children FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );