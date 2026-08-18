-- Families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  representative_name TEXT NOT NULL,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  short_address TEXT,
  description TEXT,
  region TEXT NOT NULL,
  children_count INTEGER DEFAULT 0,
  main_need TEXT,
  support_status TEXT DEFAULT 'needs_help' CHECK (support_status IN ('needs_help', 'supported', 'fed', 'pending', 'rejected', 'suspended', 'approved')),
  distance_to_user TEXT,
  priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  photo_url TEXT,
  authorizing_entity_id UUID REFERENCES authorizing_entities(id) ON DELETE SET NULL,
  created_by_entity_id UUID REFERENCES authorizing_entities(id) ON DELETE SET NULL,
  source_type TEXT CHECK (source_type IN ('entity', 'donor_indication')),
  source_entity_name TEXT,
  source_label TEXT,
  original_indication_id UUID,
  last_fed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- RLS Policies for families
CREATE POLICY "families_select_all" ON families FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "families_insert_entity" ON families FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('entity', 'admin'))
  );

CREATE POLICY "families_update_entity" ON families FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('entity', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('entity', 'admin'))
  );

CREATE POLICY "families_delete_admin" ON families FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );