import { GetTenantLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-tenant-loyalty-overview.use-case";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import {
    type LoyaltyCampaign,
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import { type Tenant, TenantType } from "@/core/entities/tenant.entity";
import {
    BusinessErrorCodes,
    ResourceErrorCodes,
    ValidationErrorCodes,
} from "@/types/error-codes";

const TENANT_ID = "tenant-1";
const now = new Date("2030-01-15T00:00:00.000Z");
const startsAt = new Date("2030-01-01T00:00:00.000Z");
const endsAt = new Date("2030-01-31T00:00:00.000Z");
const claimUntil = new Date("2030-02-10T00:00:00.000Z");

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
    return {
        id: TENANT_ID,
        name: "Tenant One",
        slug: "tenant-one",
        type: TenantType.STORE,
        active: true,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function makeCampaign(
    overrides: Partial<LoyaltyCampaign> = {},
): LoyaltyCampaign {
    return {
        id: "campaign-active",
        tenantId: TENANT_ID,
        name: "Store rewards",
        description: "Ten visits earn a coupon",
        source: LoyaltyCampaignSource.STORE,
        metric: LoyaltyCampaignMetric.COUNT,
        targetValue: "10.00",
        status: LoyaltyCampaignStatus.ACTIVE,
        startsAt,
        endsAt,
        claimUntil,
        rewardCouponId: "template-1",
        rewardValidDays: 30,
        maxClaims: 100,
        claimedCount: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

interface SetupOptions {
    tenant?: Tenant | null;
    features?: Record<string, boolean>;
    campaigns?: LoyaltyCampaign[];
    /** Claimed totals per campaign, as the repository would report them. */
    claimed?: Record<string, number>;
}

function setup(options: SetupOptions = {}) {
    const tenant = options.tenant === undefined ? makeTenant() : options.tenant;
    const features = options.features ?? { LOYALTY: true, COUPONS: true };
    const campaigns = options.campaigns ?? [];
    const claimed = options.claimed ?? {};

    const listCampaigns = jest.fn(
        async (tenantId: string): Promise<LoyaltyCampaign[]> =>
            tenantId === TENANT_ID ? campaigns : [],
    );
    // The overview counts the tenant's claims in one read now, so the
    // expectation is the sum the per-campaign loop used to produce.
    const countCampaignRewardClaims = jest.fn(
        async (tenantId: string): Promise<number> =>
            tenantId === TENANT_ID
                ? Object.values(claimed).reduce(
                      (total, value) => total + value,
                      0,
                  )
                : 0,
    );
    const findById = jest.fn(
        async (id: string): Promise<Tenant | null> =>
            id === TENANT_ID ? tenant : null,
    );
    const getTenantFeatureStatus = jest.fn(
        async (tenantId: string): Promise<Record<string, boolean>> =>
            tenantId === TENANT_ID ? features : {},
    );

    return {
        listCampaigns,
        countCampaignRewardClaims,
        findById,
        getTenantFeatureStatus,
        useCase: new GetTenantLoyaltyOverviewUseCase(
            { listCampaigns, countCampaignRewardClaims } as never,
            { findById } as never,
            { getTenantFeatureStatus } as never,
        ),
    };
}

/** Returns the rejection so a case can assert on the error, not just the throw. */
async function rejection(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise;
    } catch (error) {
        return error as Error;
    }
    throw new Error("expected the call to reject, but it resolved");
}

function lifecycleCampaigns(): LoyaltyCampaign[] {
    return [
        makeCampaign({
            id: "campaign-draft",
            name: "Draft rewards",
            description: null,
            status: LoyaltyCampaignStatus.DRAFT,
            claimedCount: 0,
        }),
        makeCampaign({ id: "campaign-active", claimedCount: 3 }),
        makeCampaign({
            id: "campaign-ended",
            name: "Ended rewards",
            status: LoyaltyCampaignStatus.ENDED,
            claimedCount: 7,
        }),
        makeCampaign({
            id: "campaign-archived",
            name: "Archived rewards",
            status: LoyaltyCampaignStatus.ARCHIVED,
            claimedCount: 11,
        }),
    ];
}

const lifecycleClaims = {
    "campaign-draft": 0,
    "campaign-active": 3,
    "campaign-ended": 7,
    "campaign-archived": 11,
};

describe("GetTenantLoyaltyOverviewUseCase", () => {
    test.each([
        ["empty", ""],
        ["whitespace-only", "   "],
        ["undefined", undefined],
    ])(
        "rejects a %s tenant id before reading any repository",
        async (_label, tenantId) => {
            const { useCase, findById, getTenantFeatureStatus, listCampaigns } =
                setup();

            // The guard is `!tenantId?.trim()`, so a runtime caller that omits
            // the argument must be rejected too; the `string` signature of
            // `execute` cannot express that call.
            const error = await rejection(useCase.execute(tenantId as string));

            expect(error).toBeInstanceOf(ValidationError);
            expect(error).toMatchObject({
                code: ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                message: "Tenant ID is required",
            });
            expect(findById).not.toHaveBeenCalled();
            expect(getTenantFeatureStatus).not.toHaveBeenCalled();
            expect(listCampaigns).not.toHaveBeenCalled();
        },
    );

    test("surfaces EntityNotFoundError when the tenant does not exist", async () => {
        const { useCase, getTenantFeatureStatus, listCampaigns } = setup({
            tenant: null,
        });

        const error = await rejection(useCase.execute(TENANT_ID));

        expect(error).toBeInstanceOf(EntityNotFoundError);
        expect(error).toMatchObject({
            code: ResourceErrorCodes.NOT_FOUND,
            message: `Tenant with id '${TENANT_ID}' not found`,
        });
        expect(getTenantFeatureStatus).not.toHaveBeenCalled();
        expect(listCampaigns).not.toHaveBeenCalled();
    });

    test("rejects with BUSINESS_LOYALTY_FEATURE_REQUIRED when LOYALTY is disabled", async () => {
        const { useCase, listCampaigns } = setup({
            features: { LOYALTY: false, COUPONS: true },
        });

        const error = await rejection(useCase.execute(TENANT_ID));

        expect(error).toBeInstanceOf(BusinessRuleViolationError);
        expect(error).toMatchObject({
            code: BusinessErrorCodes.LOYALTY_FEATURE_REQUIRED,
        });
        expect(listCampaigns).not.toHaveBeenCalled();
    });

    test("rejects with BUSINESS_LOYALTY_REQUIRES_COUPONS when COUPONS is disabled, after the LOYALTY gate", async () => {
        const { useCase, getTenantFeatureStatus, listCampaigns } = setup({
            features: { LOYALTY: true, COUPONS: false },
        });

        const error = await rejection(useCase.execute(TENANT_ID));

        expect(error).toBeInstanceOf(BusinessRuleViolationError);
        expect(error).toMatchObject({
            code: BusinessErrorCodes.LOYALTY_REQUIRES_COUPONS,
        });
        expect(getTenantFeatureStatus).toHaveBeenCalledWith(TENANT_ID);
        expect(listCampaigns).not.toHaveBeenCalled();

        // Both gates fail here: LOYALTY is asserted first, so its code wins.
        getTenantFeatureStatus.mockResolvedValue({
            LOYALTY: false,
            COUPONS: false,
        });
        const bothDisabled = await rejection(useCase.execute(TENANT_ID));
        expect(bothDisabled).toBeInstanceOf(BusinessRuleViolationError);
        expect(bothDisabled).toMatchObject({
            code: BusinessErrorCodes.LOYALTY_FEATURE_REQUIRED,
        });
    });

    test("returns the tenant identity, its campaigns and the statistics of every campaign", async () => {
        const campaigns = lifecycleCampaigns();
        const { useCase } = setup({ campaigns, claimed: lifecycleClaims });

        const result = await useCase.execute(TENANT_ID);

        expect(result).toMatchObject({
            success: true,
            message: "Loyalty overview retrieved successfully",
            data: {
                tenantId: TENANT_ID,
                name: "Tenant One",
                slug: "tenant-one",
                type: TenantType.STORE,
                active: true,
                // DRAFT is counted as a campaign but belongs to none of the
                // three lifecycle buckets, so the buckets total 3 of 4.
                stats: {
                    campaignCount: 4,
                    activeCampaignCount: 1,
                    endedCampaignCount: 1,
                    archivedCampaignCount: 1,
                    totalClaims: 21,
                },
            },
        });
        expect(result.data?.campaigns).toEqual(campaigns);
        expect(
            result.data?.campaigns.map((campaign) => campaign.status),
        ).toEqual([
            LoyaltyCampaignStatus.DRAFT,
            LoyaltyCampaignStatus.ACTIVE,
            LoyaltyCampaignStatus.ENDED,
            LoyaltyCampaignStatus.ARCHIVED,
        ]);
    });

    test("returns zeroed statistics for a tenant with no campaigns", async () => {
        const { useCase, countCampaignRewardClaims } = setup({
            campaigns: [],
        });

        const result = await useCase.execute(TENANT_ID);

        expect(result).toMatchObject({ success: true });
        expect(result.data?.campaigns).toEqual([]);
        expect(result.data?.stats).toEqual({
            campaignCount: 0,
            activeCampaignCount: 0,
            endedCampaignCount: 0,
            archivedCampaignCount: 0,
            totalClaims: 0,
        });
        expect(countCampaignRewardClaims).toHaveBeenCalledWith(TENANT_ID);
    });

    test("counts the tenant's claims in one read, not one statistics read per campaign", async () => {
        const campaigns = lifecycleCampaigns();
        const { useCase, listCampaigns, countCampaignRewardClaims } = setup({
            campaigns,
            claimed: lifecycleClaims,
        });

        const result = await useCase.execute(TENANT_ID);

        expect(listCampaigns).toHaveBeenCalledTimes(1);
        expect(listCampaigns).toHaveBeenCalledWith(TENANT_ID);
        // Was four reads, one per listed campaign, each re-reading a campaign
        // to reach a claimedCount the list already held.
        expect(countCampaignRewardClaims).toHaveBeenCalledTimes(1);
        expect(countCampaignRewardClaims).toHaveBeenCalledWith(TENANT_ID);
        expect(result.data?.stats.totalClaims).toBe(
            Object.values(lifecycleClaims).reduce(
                (total, value) => total + value,
                0,
            ),
        );
    });
});
