-- Keep the earliest reward claim for each tenant/customer before enforcing the
-- one-claim invariant. Disable duplicate personal reward coupons so they cannot
-- be used after their duplicate claim records are removed.
WITH ranked_claims AS (
    SELECT
        "id",
        "couponId",
        ROW_NUMBER() OVER (
            PARTITION BY "tenantId", "userId"
            ORDER BY "createdAt" ASC, "id" ASC
        ) AS claim_rank
    FROM "loyalty_reward_claims"
),
duplicate_coupons AS (
    SELECT "couponId"
    FROM ranked_claims
    WHERE claim_rank > 1
)
UPDATE "coupons"
SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
    SELECT "couponId"
    FROM duplicate_coupons
)
  AND "isReward" = true;

WITH ranked_claims AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "tenantId", "userId"
            ORDER BY "createdAt" ASC, "id" ASC
        ) AS claim_rank
    FROM "loyalty_reward_claims"
)
DELETE FROM "loyalty_reward_claims"
WHERE "id" IN (
    SELECT "id"
    FROM ranked_claims
    WHERE claim_rank > 1
);

-- DropIndex
DROP INDEX "loyalty_reward_claims_tenantId_userId_milestone_key";

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_reward_claims_tenantId_userId_key"
ON "loyalty_reward_claims"("tenantId", "userId");
