-- Donations table
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  gift_card_id UUID,
  message TEXT,
  is_batch BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for donations
CREATE POLICY "donations_select_own" ON donations FOR SELECT
  TO authenticated USING (
    donor_id::text = auth.uid()::text 
    OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'entity'))
  );

CREATE POLICY "donations_insert_donor" ON donations FOR INSERT
  TO authenticated WITH CHECK (donor_id::text = auth.uid()::text);

CREATE POLICY "donations_update_admin" ON donations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "donations_delete_admin" ON donations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );