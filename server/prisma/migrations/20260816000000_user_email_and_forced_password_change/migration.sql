-- AlterTable
ALTER TABLE "users" ADD COLUMN "email" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
