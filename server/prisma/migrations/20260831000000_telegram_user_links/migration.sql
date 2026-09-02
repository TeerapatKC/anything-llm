-- CreateTable
CREATE TABLE "telegram_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chat_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "telegram_username" TEXT,
    "telegram_first_name" TEXT,
    "active_workspace_id" INTEGER,
    "active_thread_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "telegram_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "telegram_users_active_workspace_id_fkey" FOREIGN KEY ("active_workspace_id") REFERENCES "workspaces" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "telegram_users_active_thread_id_fkey" FOREIGN KEY ("active_thread_id") REFERENCES "workspace_threads" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_users_chat_id_key" ON "telegram_users"("chat_id");

-- CreateIndex
CREATE INDEX "telegram_users_user_id_idx" ON "telegram_users"("user_id");
