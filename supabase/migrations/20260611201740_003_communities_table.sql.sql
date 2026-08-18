-- Communities table
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  description TEXT,
  distance TEXT,
  families_total INTEGER DEFAULT 0,
  families_in_need INTEGER DEFAULT 0,
  priority TEXT,
  urgency_color TEXT CHECK (urgency_color IN ('error', 'warning', 'success')),
  image_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communities
CREATE POLICY "communities_select_all" ON communities FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "communities_insert_admin" ON communities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "communities_update_admin" ON communities FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "communities_delete_admin" ON communities FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );