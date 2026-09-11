-- Private (per-user) workspaces.
--
-- `type` splits the table into the ordinary shared workspaces everyone already has
-- ("shared", what every pre-existing row becomes) and the private workspaces that are
-- provisioned for a single user ("personal").
--
-- `ownerId` is intentionally NOT a foreign key: adding one would force a rebuild of the
-- whole workspaces table on SQLite, exactly like `router_id` above it. User deletion
-- clears these rows through the model layer instead.
ALTER TABLE "workspaces" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'shared';
ALTER TABLE "workspaces" ADD COLUMN "ownerId" INTEGER;

CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");
