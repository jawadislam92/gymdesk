-- CreateTable
CREATE TABLE "waivers" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiver_acceptances" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "waiver_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,

    CONSTRAINT "waiver_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waivers_gym_id_is_active_idx" ON "waivers"("gym_id", "is_active");

-- CreateIndex
CREATE INDEX "waiver_acceptances_gym_id_member_id_idx" ON "waiver_acceptances"("gym_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "waiver_acceptances_waiver_id_member_id_key" ON "waiver_acceptances"("waiver_id", "member_id");

-- AddForeignKey
ALTER TABLE "waivers" ADD CONSTRAINT "waivers_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_acceptances" ADD CONSTRAINT "waiver_acceptances_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_acceptances" ADD CONSTRAINT "waiver_acceptances_waiver_id_fkey" FOREIGN KEY ("waiver_id") REFERENCES "waivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_acceptances" ADD CONSTRAINT "waiver_acceptances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
