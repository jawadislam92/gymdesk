-- AlterTable
ALTER TABLE "members" ADD COLUMN     "referral_code" TEXT;
ALTER TABLE "members" ADD COLUMN     "referred_by_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "members_referral_code_key" ON "members"("referral_code");

-- CreateTable
CREATE TABLE "loyalty_entries" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loyalty_entries_gym_id_member_id_idx" ON "loyalty_entries"("gym_id", "member_id");

-- AddForeignKey
ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
