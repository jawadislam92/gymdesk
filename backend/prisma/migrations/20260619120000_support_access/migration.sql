-- CreateTable
CREATE TABLE "support_grants" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'full',
    "reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "redeemed_at" TIMESTAMP(3),
    "redeemed_by_id" TEXT,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_grants_code_key" ON "support_grants"("code");

-- CreateIndex
CREATE INDEX "support_grants_gym_id_idx" ON "support_grants"("gym_id");

-- AddForeignKey
ALTER TABLE "support_grants" ADD CONSTRAINT "support_grants_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
