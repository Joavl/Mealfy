-- Recurrences table (recurring donations)
CREATE TABLE recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  periodicity TEXT NOT NULL CHECK (periodicity IN ('daily', 'weekly', 'monthly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  next_billing_date TIMESTAMPTZ NOT NULL,
  total_accumulated DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE recurrences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurrences
CREATE POLICY "recurrences_select_own" ON recurrences FOR SELECT
  TO authenticated USING (user_id::text = auth.uid()::text);

CREATE POLICY "recurrences_insert_own" ON recurrences FOR INSERT
  TO authenticated WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "recurrences_update_own" ON recurrences FOR UPDATE
  TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "recurrences_delete_own" ON recurrences FOR DELETE
  TO authenticated USING (user_id::text = auth.uid()::text);