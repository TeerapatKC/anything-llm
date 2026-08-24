-- Per-user personalization preferences.
--
-- NULL is "follow the instance setting" rather than "off", so existing
-- deployments keep behaving exactly as they did before this column existed.
-- The effective value is the instance policy AND the user's own choice.
ALTER TABLE "users" ADD COLUMN "memory_enabled" BOOLEAN;
ALTER TABLE "users" ADD COLUMN "memory_auto_extraction" BOOLEAN;
