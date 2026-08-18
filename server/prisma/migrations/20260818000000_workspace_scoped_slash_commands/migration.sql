-- Slash commands stop being a per-user thing and become workspace scoped.
--
-- NULL workspace_id = built-in default, usable from every workspace (managed in
--                     /settings/slash-commands).
-- set  workspace_id = defined inside that workspace and usable only there
--                     (managed in /workspace/<slug>/settings/slash-commands).
--
-- The old rows were owned by individual users and there is no meaningful workspace to
-- attach them to, so they are dropped rather than guessed at.
DELETE FROM "slash_command_presets";

-- SQLite cannot drop/alter a column in place, so the table is rebuilt. This also drops
-- the old `uid` dummy column, which only existed to give the per-user unique index
-- something non-null to constrain against.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_slash_command_presets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "command" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workspaceId" INTEGER,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slash_command_presets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slash_command_presets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

DROP TABLE "slash_command_presets";
ALTER TABLE "new_slash_command_presets" RENAME TO "slash_command_presets";

-- Unique per workspace. SQLite treats NULLs as distinct in a unique index, so this does
-- not constrain the built-ins - they are covered by the partial index below.
CREATE UNIQUE INDEX "slash_command_presets_workspaceId_command_key" ON "slash_command_presets"("workspaceId", "command");

-- Keeps built-in command names unique among themselves.
CREATE UNIQUE INDEX "slash_command_presets_builtin_command_key" ON "slash_command_presets"("command") WHERE "workspaceId" IS NULL;

CREATE INDEX "slash_command_presets_workspaceId_idx" ON "slash_command_presets"("workspaceId");

PRAGMA foreign_keys=ON;
