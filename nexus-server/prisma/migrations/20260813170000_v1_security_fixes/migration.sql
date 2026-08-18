-- Defensive cleanup before adding the unique constraint below: if any
-- duplicate (user_id, workspace_id) rows already exist (possible pre-existing
-- data issue, or from the race this migration is closing), preserve an
-- "admin" role on the surviving row if any duplicate had it, then remove the
-- extra rows, so no one's admin status is silently lost by this migration.
UPDATE "workspace_users"
SET "role" = 'admin'
WHERE "id" IN (
  SELECT MIN("id") FROM "workspace_users"
  GROUP BY "user_id", "workspace_id"
  HAVING COUNT(*) > 1
)
AND EXISTS (
  SELECT 1 FROM "workspace_users" AS "dup"
  WHERE "dup"."user_id" = "workspace_users"."user_id"
    AND "dup"."workspace_id" = "workspace_users"."workspace_id"
    AND "dup"."role" = 'admin'
);

DELETE FROM "workspace_users"
WHERE "id" NOT IN (
  SELECT MIN("id") FROM "workspace_users" GROUP BY "user_id", "workspace_id"
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_users_user_id_workspace_id_key" ON "workspace_users"("user_id", "workspace_id");
