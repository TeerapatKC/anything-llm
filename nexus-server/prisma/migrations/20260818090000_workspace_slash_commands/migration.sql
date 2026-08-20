-- AlterTable
ALTER TABLE "slash_command_presets" ADD COLUMN "workspaceId" INTEGER;

-- CreateIndex
CREATE INDEX "slash_command_presets_workspaceId_idx" ON "slash_command_presets"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "slash_command_presets_workspaceId_command_key" ON "slash_command_presets"("workspaceId", "command");
