-- CreateEnum
CREATE TYPE "LoyaltyRewardClaimStatus" AS ENUM ('CLAIMED');

-- AlterTable
ALTER TABLE "coupons"
ADD COLUMN "ownerId" TEXT,
ADD COLUMN "isReward" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sourceCouponId" TEXT;

-- CreateIndex
CREATE INDEX "coupons_ownerId_idx" ON "coupons"("ownerId");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_sourceCouponId_fkey" FOREIGN KEY ("sourceCouponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "loyalty_ledger_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceAppointmentId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_reward_claims" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestone" INTEGER NOT NULL DEFAULT 10,
    "couponId" TEXT NOT NULL,
    "status" "LoyaltyRewardClaimStatus" NOT NULL DEFAULT 'CLAIMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_ledger_entries_tenantId_sourceAppointmentId_key" ON "loyalty_ledger_entries"("tenantId", "sourceAppointmentId");
CREATE INDEX "loyalty_ledger_entries_tenantId_userId_createdAt_idx" ON "loyalty_ledger_entries"("tenantId", "userId", "createdAt");
CREATE UNIQUE INDEX "loyalty_reward_claims_couponId_key" ON "loyalty_reward_claims"("couponId");
CREATE UNIQUE INDEX "loyalty_reward_claims_tenantId_userId_milestone_key" ON "loyalty_reward_claims"("tenantId", "userId", "milestone");
CREATE INDEX "loyalty_reward_claims_tenantId_userId_idx" ON "loyalty_reward_claims"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "loyalty_ledger_entries" ADD CONSTRAINT "loyalty_ledger_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_ledger_entries" ADD CONSTRAINT "loyalty_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_ledger_entries" ADD CONSTRAINT "loyalty_ledger_entries_sourceAppointmentId_fkey" FOREIGN KEY ("sourceAppointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_reward_claims" ADD CONSTRAINT "loyalty_reward_claims_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_reward_claims" ADD CONSTRAINT "loyalty_reward_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_reward_claims" ADD CONSTRAINT "loyalty_reward_claims_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
