-- PostgreSQL requires the enum ADD VALUE transaction to commit before the value
-- can be referenced in a partial-index predicate.
CREATE UNIQUE INDEX "direct_pix_follow_up_holder_divergent_open_unique"
  ON "direct_pix_follow_up_cases"("intent_id", "reason")
  WHERE "status" = 'OPEN' AND "reason" = 'HOLDER_DIVERGENT';
