-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "timing_days" INTEGER NOT NULL DEFAULT 7,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "title" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automations_gym_id_enabled_idx" ON "automations"("gym_id", "enabled");

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
