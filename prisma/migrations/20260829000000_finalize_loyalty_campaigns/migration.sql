-- Contract migration: refuse to hide incomplete campaign backfill data.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "loyalty_ledger_entries"
        WHERE "campaignId" IS NULL
           OR "sourceType" IS NULL
           OR "sourceId" IS NULL
           OR "value" IS NULL
    ) THEN
        RAISE EXCEPTION 'Loyalty ledger campaign backfill is incomplete';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "loyalty_reward_claims"
        WHERE "campaignId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Loyalty reward claim campaign backfill is incomplete';
    END IF;
END $$;

-- Finalize the campaign contract.
ALTER TABLE "loyalty_ledger_entries"
ALTER COLUMN "campaignId" SET NOT NULL,
ALTER COLUMN "sourceType" SET NOT NULL,
ALTER COLUMN "sourceId" SET NOT NULL,
ALTER COLUMN "value" SET NOT NULL;

ALTER TABLE "loyalty_reward_claims"
ALTER COLUMN "campaignId" SET NOT NULL;

-- Remove legacy tenant/user and source uniqueness paths.
DROP INDEX "loyalty_reward_claims_tenantId_userId_key";
DROP INDEX "loyalty_reward_claims_tenantId_userId_idx";
DROP INDEX "loyalty_ledger_entries_tenantId_sourceAppointmentId_key";
DROP INDEX "loyalty_ledger_entries_tenantId_userId_createdAt_idx";

-- Remove the booking-only ledger relation and claim milestone.
ALTER TABLE "loyalty_ledger_entries"
DROP CONSTRAINT "loyalty_ledger_entries_sourceAppointmentId_fkey";

ALTER TABLE "loyalty_ledger_entries"
DROP COLUMN "sourceAppointmentId";

ALTER TABLE "loyalty_ledger_entries"
DROP COLUMN "points";

ALTER TABLE "loyalty_reward_claims"
DROP COLUMN "milestone";

-- Accruals cannot reduce progress; reversals must reduce it.
ALTER TABLE "loyalty_ledger_entries"
ADD CONSTRAINT "loyalty_ledger_entries_value_sign_check"
CHECK (
    ("entryType" = 'ACCRUAL' AND "value" >= 0)
    OR ("entryType" = 'REVERSAL' AND "value" < 0)
);

-- Campaign rows are now the only loyalty configuration.
UPDATE "tenants"
SET "config" = "config" - 'loyalty'
WHERE "config" ? 'loyalty';
