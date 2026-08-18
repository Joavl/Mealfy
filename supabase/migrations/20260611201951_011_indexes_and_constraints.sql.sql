-- Add foreign key constraint from users to authorizing_entities
ALTER TABLE users ADD CONSTRAINT fk_users_entity 
  FOREIGN KEY (entity_id) REFERENCES authorizing_entities(id) ON DELETE SET NULL;

-- Add foreign key constraint from families to donor_indications
ALTER TABLE families ADD CONSTRAINT fk_families_original_indication 
  FOREIGN KEY (original_indication_id) REFERENCES donor_indications(id) ON DELETE SET NULL;

-- Add foreign key constraint from donations to gift_cards
ALTER TABLE donations ADD CONSTRAINT fk_donations_giftcard 
  FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_entities_status ON authorizing_entities(status);
CREATE INDEX idx_entities_region ON authorizing_entities(region);

CREATE INDEX idx_families_community ON families(community_id);
CREATE INDEX idx_families_status ON families(status);
CREATE INDEX idx_families_support_status ON families(support_status);
CREATE INDEX idx_families_region ON families(region);
CREATE INDEX idx_families_source_type ON families(source_type);

CREATE INDEX idx_children_family ON children(family_id);

CREATE INDEX idx_indications_user ON donor_indications(indicated_by_user_id);
CREATE INDEX idx_indications_status ON donor_indications(status);

CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_family ON donations(family_id);
CREATE INDEX idx_donations_community ON donations(community_id);
CREATE INDEX idx_donations_created ON donations(created_at DESC);

CREATE INDEX idx_giftcards_donor ON gift_cards(donor_id);
CREATE INDEX idx_giftcards_family ON gift_cards(family_id);
CREATE INDEX idx_giftcards_status ON gift_cards(status);
CREATE INDEX idx_giftcards_code ON gift_cards(code);

CREATE INDEX idx_recurrences_user ON recurrences(user_id);
CREATE INDEX idx_recurrences_status ON recurrences(status);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);