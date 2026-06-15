-- AlterTable
ALTER TABLE "members" ADD COLUMN     "check_in_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "members_check_in_token_key" ON "members"("check_in_token");
