import { prisma } from "@/config/db.config";
import { CouponType } from "@/core/entities/coupon.entity";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";

/**
 * A campaign's claimedCount is a cache of how many reward claims it holds, kept
 * in step by the `loyalty_reward_claim_sync_claimed_count` trigger. Nothing in
 * Prisma declares that trigger, so this suite is the only thing standing between
 * a future migration or a new cascade path and a silently wrong counter.
 *
 * It needs a real database, so it lives with the other integration suites rather
 * than under test/unit. That is deliberate: a trigger cannot be exercised
 * against a mock, and this is the behaviour that decides whether a customer can
 * still claim a reward at all.
 */

const tag = `claimedcount-${Date.now()}`;
const now = new Date();
const inWindow = new Date(now.getTime() - 86_400_000);
const outWindow = new Date(now.getTime() + 86_400_000);
const rewardExpiry = new Date(now.getTime() + 30 * 86_400_000);

type Chain = {
    tenantId: string;
    userId: string;
    campaignId: string;
    couponId: string;
};

/**
 * A tenant with one user, one campaign limited to a single claim, and a claim
 * the user has already made. `maxClaims: 1` is what turns a stale counter into a
 * real problem: with the counter stuck at 1, `claimedCount < maxClaims` is false
 * for everyone and the campaign is closed for good.
 */
async function buildClaimedCampaign(): Promise<Chain> {
    const tenant = await prisma.tenant.create({
        data: { name: "Claimed Count", slug: `${tag}-tenant` },
        select: { id: true },
    });
    const user = await prisma.user.create({
        data: {
            name: "Reward Holder",
            email: `${tag}@example.invalid`,
            password: "not-a-real-password",
        },
        select: { id: true },
    });
    const template = await prisma.coupon.create({
        data: {
            code: `${tag}-TEMPLATE`,
            type: CouponType.PERCENT,
            value: 10,
            tenantId: tenant.id,
            expiresAt: rewardExpiry,
            isLoyaltyTemplate: true,
        },
        select: { id: true },
    });
    const campaign = await prisma.loyaltyCampaign.create({
        data: {
            tenantId: tenant.id,
            name: "Single claim campaign",
            source: LoyaltyCampaignSource.STORE,
            metric: LoyaltyCampaignMetric.COUNT,
            targetValue: "10.00",
            status: LoyaltyCampaignStatus.ACTIVE,
            startsAt: inWindow,
            endsAt: outWindow,
            claimUntil: outWindow,
            rewardCouponId: template.id,
            rewardValidDays: 30,
            maxClaims: 1,
        },
        select: { id: true },
    });
    const coupon = await prisma.coupon.create({
        data: {
            code: `${tag}-REWARD`,
            type: CouponType.PERCENT,
            value: 10,
            tenantId: tenant.id,
            ownerId: user.id,
            expiresAt: rewardExpiry,
            isReward: true,
        },
        select: { id: true },
    });
    await prisma.loyaltyRewardClaim.create({
        data: {
            tenantId: tenant.id,
            campaignId: campaign.id,
            userId: user.id,
            couponId: coupon.id,
        },
    });
    return {
        tenantId: tenant.id,
        userId: user.id,
        campaignId: campaign.id,
        couponId: coupon.id,
    };
}

async function readClaimedCount(campaignId: string): Promise<number> {
    const campaign = await prisma.loyaltyCampaign.findUnique({
        where: { id: campaignId },
        select: { claimedCount: true },
    });
    return campaign?.claimedCount ?? -1;
}

async function removeChain(chain: Chain): Promise<void> {
    // The tenant goes last and in a finally, because a test that fails partway
    // through would otherwise skip every later step and leave its tenant, its
    // campaigns and its coupons behind. A suite that leaks only when it is
    // already red hides the next run's cause behind its leftovers.
    try {
        await prisma.loyaltyRewardClaim.deleteMany({
            where: { tenantId: chain.tenantId },
        });
        // Campaigns before coupons: a campaign references its reward template
        // with onDelete: Restrict, so the coupon cannot go first.
        await prisma.loyaltyCampaign.deleteMany({
            where: { tenantId: chain.tenantId },
        });
        await prisma.coupon.deleteMany({ where: { tenantId: chain.tenantId } });
        await prisma.user.deleteMany({ where: { id: chain.userId } });
    } finally {
        await prisma.tenant.deleteMany({ where: { id: chain.tenantId } });
    }
}

describe("claimedCount follows its reward claims", () => {
    let chain: Chain;

    beforeEach(async () => {
        chain = await buildClaimedCampaign();
    });

    afterEach(async () => {
        await removeChain(chain);
    });

    test("inserting a claim raises the counter the claim reservation reads", async () => {
        expect(await readClaimedCount(chain.campaignId)).toBe(1);
    });

    test("deleting the user gives the campaign's single claim slot back", async () => {
        expect(await readClaimedCount(chain.campaignId)).toBe(1);

        // The real path: DeleteUserUseCase reaches user.deleteForTenant, which
        // is a hard deleteMany. The claim and its coupon go with the user.
        await prisma.user.deleteMany({ where: { id: chain.userId } });

        const claims = await prisma.loyaltyRewardClaim.count({
            where: { tenantId: chain.tenantId },
        });
        const coupons = await prisma.coupon.count({
            where: { id: chain.couponId },
        });
        expect(claims).toBe(0);
        expect(coupons).toBe(0);
        expect(await readClaimedCount(chain.campaignId)).toBe(0);
    });

    test("the freed slot lets the next customer claim the campaign", async () => {
        // Before the delete the slot is taken, and this is the conditional
        // update the claim reservation performs. Asserting it is refused first is
        // what makes this a guard: without the before-state, the update would
        // succeed from a counter that simply started at zero, which is a pass
        // that proves nothing about the delete.
        const beforeDelete = await prisma.loyaltyCampaign.updateMany({
            where: { id: chain.campaignId, claimedCount: { lt: 1 } },
            data: { claimedCount: { increment: 1 } },
        });
        expect(beforeDelete.count).toBe(0);
        expect(await readClaimedCount(chain.campaignId)).toBe(1);

        await prisma.user.deleteMany({ where: { id: chain.userId } });

        // The consequence that matters. A campaign whose counter is stuck at 1
        // with maxClaims 1 fails this update for every remaining customer, and
        // the reward is unreachable from then on.
        const afterDelete = await prisma.loyaltyCampaign.updateMany({
            where: { id: chain.campaignId, claimedCount: { lt: 1 } },
            data: { claimedCount: { increment: 1 } },
        });
        expect(afterDelete.count).toBe(1);
        expect(await readClaimedCount(chain.campaignId)).toBe(1);
    });
});
