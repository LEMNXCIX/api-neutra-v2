import { prisma } from "@/config/db.config";
import { CouponType } from "@/core/entities/coupon.entity";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import { LoyaltyErrorCodes } from "@/types/error-codes";

/**
 * A tenant may have only one ACTIVE campaign at a time, because an event has to
 * accrue into exactly one campaign and the accrual query takes the newest
 * eligible one. The rule is enforced by the partial unique index
 * `loyalty_campaigns_one_active_per_tenant_key`, which Prisma cannot express
 * because it is a partial index and is therefore absent from schema.prisma.
 *
 * The consequence of relying on the index alone is an HTTP 500: activating a
 * second campaign while one is already active violates the index, Prisma
 * reports it as an unknown unique violation, and nothing translates it. These
 * cases assert it arrives as a business rule violation instead.
 *
 * Integration, not unit: the constraint is the database's, and only a real
 * database can reproduce it.
 */

const tag = `activeone-${Date.now()}`;
const now = new Date();
const inWindow = new Date(now.getTime() - 86_400_000);
const outWindow = new Date(now.getTime() + 86_400_000);
const rewardExpiry = new Date(now.getTime() + 30 * 86_400_000);

async function buildTenantCampaigns(): Promise<{
    tenantId: string;
    templateId: string;
    activeId: string;
    draftId: string;
}> {
    const tenant = await prisma.tenant.create({
        data: { name: "One Active", slug: `${tag}-tenant` },
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

    const shared = {
        tenantId: tenant.id,
        source: LoyaltyCampaignSource.STORE,
        metric: LoyaltyCampaignMetric.COUNT,
        targetValue: "10.00",
        startsAt: inWindow,
        endsAt: outWindow,
        claimUntil: outWindow,
        rewardCouponId: template.id,
        rewardValidDays: 30,
    };

    const active = await prisma.loyaltyCampaign.create({
        data: { ...shared, name: "Already running", status: LoyaltyCampaignStatus.ACTIVE },
        select: { id: true },
    });
    const draft = await prisma.loyaltyCampaign.create({
        data: { ...shared, name: "Waiting", status: LoyaltyCampaignStatus.DRAFT },
        select: { id: true },
    });
    return { tenantId: tenant.id, templateId: template.id, activeId: active.id, draftId: draft.id };
}

async function cleanTenant(tenantId: string): Promise<void> {
    await prisma.loyaltyCampaign.deleteMany({ where: { tenantId } });
    await prisma.coupon.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

describe("one active loyalty campaign per tenant", () => {
    const repository = new PrismaLoyaltyRepository(prisma as never);
    let built: Awaited<ReturnType<typeof buildTenantCampaigns>>;

    beforeEach(async () => {
        built = await buildTenantCampaigns();
    });

    afterEach(async () => {
        await cleanTenant(built.tenantId);
    });

    test("activating a second campaign is a business rule violation, not a crash", async () => {
        await expect(
            repository.transitionCampaignStatus(
                built.tenantId,
                built.draftId,
                LoyaltyCampaignStatus.DRAFT,
                LoyaltyCampaignStatus.ACTIVE,
            ),
        ).rejects.toMatchObject({
            code: LoyaltyErrorCodes.CAMPAIGN_ALREADY_ACTIVE_PER_TENANT,
        });
    });

    test("the rejected campaign is left untouched", async () => {
        await expect(
            repository.transitionCampaignStatus(
                built.tenantId,
                built.draftId,
                LoyaltyCampaignStatus.DRAFT,
                LoyaltyCampaignStatus.ACTIVE,
            ),
        ).rejects.toBeInstanceOf(BusinessRuleViolationError);

        const still = await prisma.loyaltyCampaign.findUnique({
            where: { id: built.draftId },
            select: { status: true },
        });
        expect(still?.status).toBe(LoyaltyCampaignStatus.DRAFT);
    });

    test("ending the running campaign frees the slot", async () => {
        await repository.transitionCampaignStatus(
            built.tenantId,
            built.activeId,
            LoyaltyCampaignStatus.ACTIVE,
            LoyaltyCampaignStatus.ENDED,
        );

        await expect(
            repository.transitionCampaignStatus(
                built.tenantId,
                built.draftId,
                LoyaltyCampaignStatus.DRAFT,
                LoyaltyCampaignStatus.ACTIVE,
            ),
        ).resolves.toMatchObject({ status: LoyaltyCampaignStatus.ACTIVE });
    });

    test("the database refuses a second active campaign even without the check", async () => {
        // Pins the constraint itself. Without this, deleting the check would
        // leave the suites green while the database still rejected writes.
        await expect(
            prisma.loyaltyCampaign.updateMany({
                where: { id: built.draftId },
                data: { status: LoyaltyCampaignStatus.ACTIVE },
            }),
        ).rejects.toMatchObject({ code: "P2002" });
    });
});
