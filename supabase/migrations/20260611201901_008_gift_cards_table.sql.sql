-- Gift Cards table
CREATE TABLE gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  donor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  provider TEXT DEFAULT 'ifood',
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'delivered', 'used', 'redeemed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gift_cards
CREATE POLICY "giftcards_select_own" ON gift_cards FOR SELECT
  TO authenticated USING (
    donor_id::text = auth.uid()::text 
    OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'entity'))
  );

CREATE POLICY "giftcards_insert_admin" ON gift_cards FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "giftcards_update_admin" ON gift_cards FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'entity'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'entity'))
  );

CREATE POLICY "giftcards_delete_admin" ON gift_cards FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );