-- A key version must remain bound to the same family as its responsible assignment.
-- Prisma relations alone cannot express this cross-table invariant.
CREATE FUNCTION enforce_direct_pix_evp_assignment_family() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "family_responsible_assignments" assignment
    WHERE assignment."id" = NEW."assignmentId"
      AND assignment."familyId" = NEW."familyId"
  ) THEN
    RAISE EXCEPTION 'direct Pix EVP assignment must belong to the key family';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER direct_pix_evp_assignment_family_guard
  BEFORE INSERT OR UPDATE OF "familyId", "assignmentId"
  ON "direct_pix_evp_key_versions"
  FOR EACH ROW EXECUTE FUNCTION enforce_direct_pix_evp_assignment_family();
