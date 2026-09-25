-- CreateEnum
CREATE TYPE "LoyaltyCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'ARCHIVED');
CREATE TYPE "LoyaltyCampaignSource" AS ENUM ('BOOKING', 'STORE', 'ALL');
CREATE TYPE "LoyaltyCampaignMetric" AS ENUM ('COUNT', 'SPEND');
CREATE TYPE "LoyaltySourceType" AS ENUM ('APPOINTMENT', 'ORDER');
CREATE TYPE "LoyaltyLedgerEntryType" AS ENUM ('ACCRUAL', 'REVERSAL');

-- ExpandTable
ALTER TABLE "coupons"
ADD COLUMN "isLoyaltyTemplate" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "loyalty_ledger_entries"
ADD COLUMN "campaignId" TEXT,
ADD COLUMN "sourceType" "LoyaltySourceType",
ADD COLUMN "sourceId" TEXT,
ADD COLUMN "value" DECIMAL(18,2),
ADD COLUMN "entryType" "LoyaltyLedgerEntryType" NOT NULL DEFAULT 'ACCRUAL',
ADD COLUMN "reversalOfId" TEXT;

ALTER TABLE "loyalty_ledger_entries"
ALTER COLUMN "sourceAppointmentId" DROP NOT NULL,
ALTER COLUMN "points" DROP NOT NULL;

ALTER TABLE "loyalty_reward_claims"
ADD COLUMN "campaignId" TEXT;

ALTER TABLE "loyalty_reward_claims"
ALTER COLUMN "milestone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "loyalty_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" "LoyaltyCampaignSource" NOT NULL,
    "metric" "LoyaltyCampaignMetric" NOT NULL,
    "targetValue" DECIMAL(18,2) NOT NULL,
    "status" "LoyaltyCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "claimUntil" TIMESTAMP(3) NOT NULL,
    "rewardCouponId" TEXT,
    "rewardValidDays" INTEGER,
    "maxClaims" INTEGER,
    "claimedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_campaigns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_campaigns_targetValue_check" CHECK ("targetValue" > 0),
    CONSTRAINT "loyalty_campaigns_maxClaims_check" CHECK ("maxClaims" IS NULL OR ("maxClaims" > 0 AND "claimedCount" <= "maxClaims")),
    CONSTRAINT "loyalty_campaigns_rewardValidDays_check" CHECK ("rewardValidDays" IS NULL OR "rewardValidDays" > 0),
    CONSTRAINT "loyalty_campaigns_claimedCount_check" CHECK ("claimedCount" >= 0),
    CONSTRAINT "loyalty_campaigns_dates_check" CHECK ("startsAt" < "endsAt" AND "endsAt" <= "claimUntil")
);

-- Preserve every tenant with legacy booking accruals or claims in one archived campaign.
WITH legacy_events AS (
    SELECT "tenantId", "createdAt" AS "eventAt", NULL::TIMESTAMP(3) AS "claimAt"
    FROM "loyalty_ledger_entries"
    UNION ALL
    SELECT "tenantId", "createdAt" AS "eventAt", "createdAt" AS "claimAt"
    FROM "loyalty_reward_claims"
),
legacy_event_ranges AS (
    SELECT
        "tenantId",
        MIN("eventAt") AS "startsAt",
        MAX("eventAt") AS "latestEventAt",
        MAX("claimAt") AS "latestClaimAt"
    FROM "legacy_events"
    GROUP BY "tenantId"
),
legacy_ranges AS (
    SELECT
        "tenantId",
        "startsAt",
        CASE
            WHEN "latestEventAt" > "startsAt" THEN "latestEventAt"
            ELSE "latestEventAt" + INTERVAL '1 millisecond'
        END AS "endsAt",
        GREATEST(
            COALESCE("latestClaimAt", "latestEventAt"),
            CASE
                WHEN "latestEventAt" > "startsAt" THEN "latestEventAt"
                ELSE "latestEventAt" + INTERVAL '1 millisecond'
            END
        ) AS "claimUntil"
    FROM "legacy_event_ranges"
),
legacy_claim_counts AS (
    SELECT "tenantId", COUNT(*)::INTEGER AS "claimCount"
    FROM "loyalty_reward_claims"
    GROUP BY "tenantId"
),
legacy_claim_targets AS (
    SELECT
        "tenantId",
        CASE WHEN MAX("milestone") > 0 THEN MAX("milestone") END AS "targetValue"
    FROM "loyalty_reward_claims"
    GROUP BY "tenantId"
),
legacy_tenants AS (
    SELECT
        tenant."id" AS "tenantId",
        tenant."config" AS "config",
        CASE
            WHEN jsonb_typeof(tenant."config" #> '{loyalty,targetPoints}') = 'number'
             AND (tenant."config" #>> '{loyalty,targetPoints}') ~ '^[1-9][0-9]{0,15}$'
            THEN CASE
                WHEN (tenant."config" #>> '{loyalty,targetPoints}')::NUMERIC <= 9007199254740991::NUMERIC
                 AND (tenant."config" #>> '{loyalty,targetPoints}')::NUMERIC < 10000000000000000::NUMERIC
                THEN (tenant."config" #>> '{loyalty,targetPoints}')::NUMERIC
            END
        END AS "configuredTarget"
    FROM "tenants" AS tenant
)
INSERT INTO "loyalty_campaigns" (
    "id",
    "tenantId",
    "name",
    "description",
    "source",
    "metric",
    "targetValue",
    "status",
    "startsAt",
    "endsAt",
    "claimUntil",
    "rewardCouponId",
    "rewardValidDays",
    "maxClaims",
    "claimedCount",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::TEXT,
    legacy_range."tenantId",
    'Legacy booking loyalty',
    'Migrated from tenant-level booking loyalty.',
    'BOOKING',
    'COUNT',
    COALESCE(
        legacy_tenant."configuredTarget",
        legacy_claim_target."targetValue"::NUMERIC,
        10::NUMERIC
    ),
    'ARCHIVED',
    legacy_range."startsAt",
    legacy_range."endsAt",
    legacy_range."claimUntil",
    (
        SELECT coupon."id"
        FROM "coupons" AS coupon
        WHERE coupon."id" = NULLIF(legacy_tenant."config" #>> '{loyalty,rewardCouponId}', '')
          AND coupon."tenantId" = legacy_tenant."tenantId"
          AND coupon."ownerId" IS NULL
          AND coupon."isReward" = false
        LIMIT 1
    ),
    NULL,
    NULLIF(legacy_claim_count."claimCount", 0),
    COALESCE(legacy_claim_count."claimCount", 0),
    legacy_range."startsAt",
    legacy_range."endsAt"
FROM legacy_ranges AS legacy_range
JOIN legacy_tenants AS legacy_tenant
    ON legacy_tenant."tenantId" = legacy_range."tenantId"
LEFT JOIN legacy_claim_counts AS legacy_claim_count
    ON legacy_claim_count."tenantId" = legacy_range."tenantId"
LEFT JOIN legacy_claim_targets AS legacy_claim_target
    ON legacy_claim_target."tenantId" = legacy_range."tenantId";

-- Backfill generic campaign progress while preserving the legacy contract.
UPDATE "loyalty_ledger_entries" AS ledger
SET
    "campaignId" = campaign."id",
    "sourceType" = 'APPOINTMENT',
    "sourceId" = ledger."sourceAppointmentId",
    "value" = ledger."points"::NUMERIC
FROM "loyalty_campaigns" AS campaign
WHERE campaign."tenantId" = ledger."tenantId"
  AND campaign."name" = 'Legacy booking loyalty'
  AND campaign."description" = 'Migrated from tenant-level booking loyalty.'
  AND campaign."status" = 'ARCHIVED';

UPDATE "loyalty_reward_claims" AS claim
SET "campaignId" = campaign."id"
FROM "loyalty_campaigns" AS campaign
WHERE campaign."tenantId" = claim."tenantId"
  AND campaign."name" = 'Legacy booking loyalty'
  AND campaign."description" = 'Migrated from tenant-level booking loyalty.'
  AND campaign."status" = 'ARCHIVED';

-- Mark the configured shared coupon so later campaign administration can identify templates.
UPDATE "coupons" AS coupon
SET "isLoyaltyTemplate" = true
FROM "loyalty_campaigns" AS campaign
WHERE campaign."rewardCouponId" = coupon."id"
  AND campaign."name" = 'Legacy booking loyalty'
  AND campaign."description" = 'Migrated from tenant-level booking loyalty.';

-- CreateIndex
CREATE INDEX "coupons_isLoyaltyTemplate_idx" ON "coupons"("isLoyaltyTemplate");
CREATE INDEX "loyalty_campaigns_tenantId_status_idx" ON "loyalty_campaigns"("tenantId", "status");
CREATE INDEX "loyalty_campaigns_tenantId_source_status_idx" ON "loyalty_campaigns"("tenantId", "source", "status");
CREATE INDEX "loyalty_campaigns_rewardCouponId_idx" ON "loyalty_campaigns"("rewardCouponId");
CREATE UNIQUE INDEX "loyalty_campaigns_one_active_per_tenant_key"
ON "loyalty_campaigns"("tenantId")
WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "loyalty_ledger_entries_reversalOfId_key"
ON "loyalty_ledger_entries"("reversalOfId");
CREATE UNIQUE INDEX "loyalty_ledger_entries_campaignId_sourceType_sourceId_entryType_key"
ON "loyalty_ledger_entries"("campaignId", "sourceType", "sourceId", "entryType");
CREATE INDEX "loyalty_ledger_entries_tenantId_campaignId_userId_createdAt_idx"
ON "loyalty_ledger_entries"("tenantId", "campaignId", "userId", "createdAt");
CREATE UNIQUE INDEX "loyalty_reward_claims_campaignId_userId_key"
ON "loyalty_reward_claims"("campaignId", "userId");
CREATE INDEX "loyalty_reward_claims_tenantId_campaignId_userId_idx"
ON "loyalty_reward_claims"("tenantId", "campaignId", "userId");

-- AddForeignKey
ALTER TABLE "loyalty_campaigns" ADD CONSTRAINT "loyalty_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_campaigns" ADD CONSTRAINT "loyalty_campaigns_rewardCouponId_fkey" FOREIGN KEY ("rewardCouponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loyalty_ledger_entries" ADD CONSTRAINT "loyalty_ledger_entries_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "loyalty_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loyalty_ledger_entries" ADD CONSTRAINT "loyalty_ledger_entries_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "loyalty_ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "loyalty_reward_claims" ADD CONSTRAINT "loyalty_reward_claims_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "loyalty_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
