-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "assigned_to" TEXT,
ADD COLUMN     "converted_member_id" TEXT,
ADD COLUMN     "follow_up_at" TIMESTAMP(3),
ADD COLUMN     "last_activity_at" TIMESTAMP(3),
ADD COLUMN     "lost_reason" TEXT,
ADD COLUMN     "value" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_activities_gym_id_lead_id_idx" ON "lead_activities"("gym_id", "lead_id");

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
