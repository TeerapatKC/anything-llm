-- CreateTable
CREATE TABLE "line_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "line_user_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "line_display_name" TEXT,
    "active_workspace_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "line_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "line_users_active_workspace_id_fkey" FOREIGN KEY ("active_workspace_id") REFERENCES "workspaces" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "line_users_line_user_id_key" ON "line_users"("line_user_id");

-- CreateIndex
CREATE INDEX "line_users_user_id_idx" ON "line_users"("user_id");
