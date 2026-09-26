-- LoyaltyCampaign.claimedCount is a cache of "how many reward claims does this
-- campaign actually hold". The claim reservation in
-- claimCampaignReward needs it: a single conditional UPDATE carrying
-- `claimedCount < maxClaims` and an increment is what makes the claim limit
-- hold under concurrency, and it cannot be counted on the fly without giving
-- that up.
--
-- It drifted because the cache sits next to a foreign key that cascades.
-- Deleting a user takes their reward claims with it, and nothing told the
-- counter. A campaign with maxClaims 1 then reported 1 of 1 claimed with zero
-- rewards outstanding, `claimedCount < maxClaims` stopped being true, and no
-- other customer could ever claim that campaign again. Verified against the
-- real database before this migration: deleting a user who had claimed left
-- the claim and the coupon gone and claimedCount at 1.
--
-- Recomputing from the claims table is cheap. One campaign is touched per
-- deleted claim, and "campaignId" is covered by the unique index on
-- (campaignId, userId), so the count is an index scan over one campaign's
-- claims. It also self-heals: recomputing is correct even if some other path
-- ever removes a claim, which an increment or a decrement would not be.
--
-- Only INSERT and DELETE are handled. Claims are insert-only in this codebase:
-- no code path updates one, so there is no old-campaign/new-campaign pair to
-- reconcile on UPDATE.
--
-- Prisma cannot express a trigger, so this is invisible to `prisma validate`
-- and to a future `prisma migrate diff`, which is why the invariant is
-- restated on the model in schema.prisma. The regression lives in
-- test/loyalty-user-delete.test.ts and needs a real database, so it runs in
-- the integration suites.
CREATE OR REPLACE FUNCTION loyalty_campaign_sync_claimed_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    campaign_id text;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        campaign_id := OLD."campaignId";
    ELSE
        campaign_id := NEW."campaignId";
    END IF;

    UPDATE "loyalty_campaigns"
    SET "claimedCount" = (
        SELECT count(*)::int
        FROM "loyalty_reward_claims"
        WHERE "campaignId" = campaign_id
    )
    WHERE id = campaign_id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER "loyalty_reward_claim_sync_claimed_count"
AFTER INSERT OR DELETE ON "loyalty_reward_claims"
FOR EACH ROW
EXECUTE FUNCTION loyalty_campaign_sync_claimed_count();

-- One-time reconciliation of any row that already drifted before the trigger
-- existed. Idempotent: it sets each campaign to its true count.
UPDATE "loyalty_campaigns" AS campaign
SET "claimedCount" = (
    SELECT count(*)::int
    FROM "loyalty_reward_claims" AS claim
    WHERE claim."campaignId" = campaign.id
);
