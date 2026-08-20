-- Hosted Customer Trial expiry. Strictly additive: nullable column, no
-- backfill - every existing customer keeps trialExpiresAt = NULL (no trial
-- limit), today's exact behavior.
ALTER TABLE "customers" ADD COLUMN "trialExpiresAt" DATETIME;
