-- Authorizing Entities table (ONGs, churches, schools, institutes)
CREATE TABLE authorizing_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ONG', 'igreja', 'escola', 'instituto')),
  responsible_name TEXT NOT NULL,
  responsible_role TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  region TEXT NOT NULL,
  address_or_district TEXT,
  website_or_instagram TEXT,
  short_description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE authorizing_entities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authorizing_entities
CREATE POLICY "entities_select_all" ON authorizing_entities FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "entities_insert_admin" ON authorizing_entities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "entities_update_admin" ON authorizing_entities FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "entities_delete_admin" ON authorizing_entities FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );