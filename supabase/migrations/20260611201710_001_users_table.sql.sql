-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('donor', 'entity', 'beneficiary', 'admin')),
  phone TEXT,
  document_type TEXT CHECK (document_type IN ('cpf', 'cnpj')),
  document_number TEXT,
  avatar TEXT,
  instagram TEXT,
  total_donated DECIMAL(10,2) DEFAULT 0,
  ranking_position INTEGER,
  ranking_percentile TEXT,
  favorite_community_id UUID,
  entity_id UUID,
  beneficiary_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'suspended')),
  privacy_settings JSONB DEFAULT '{"showOnRanking": true, "showInstagram": true, "anonymousMode": false}',
  impact_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated USING (auth.uid()::text = id::text OR role = 'admin');

CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "users_delete_own" ON users FOR DELETE
  TO authenticated USING (auth.uid()::text = id::text);