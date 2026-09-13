-- Preserve the model used for each response, even if workspace defaults change later.
ALTER TABLE "workspace_chats" ADD COLUMN "ai_model" TEXT;
