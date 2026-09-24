import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    CreateLoyaltyCampaignData,
    CreateLoyaltyLedgerEntryData,
    ILoyaltyRepository,
    LoyaltyCampaignClaimResult,
    LoyaltyRewardClaimResult,
    UpdateLoyaltyCampaignData,
} from "@/core/repositories/loyalty.repository.interface";
import {
    canTransitionLoyaltyCampaignStatus,
    getLoyaltyCampaignProgressValue,
    isLoyaltyCampaignClaimable,
    isValidLoyaltyCampaignDates,
    isValidLoyaltyCampaignMaxClaims,
    isValidLoyaltyCampaignTarget,
    isValidLoyaltyRewardValidDays,
    isValidLoyaltyTargetPoints,
    LoyaltyCampaign,
    LoyaltyCampaignMetric,
    LoyaltyCampaignProgress,
    LoyaltyCampaignRewardClaim,
    LoyaltyCampaignSource,
    LoyaltyCampaignStats,
    LoyaltyCampaignStatus,
    LoyaltyLedgerEntry,
    LoyaltyRewardClaim,
    LoyaltyRewardClaimStatus,
    LoyaltySourceType,
    LoyaltyTenantStats,
    LOYALTY_REWARD_MILESTONE,
} from "@/core/entities/loyalty.entity";
import { Coupon, CouponType } from "@/core/entities/coupon.entity";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";

type CouponRecord = {
    id: string;
    tenantId: string;
    code: string;
    type: string;
    value: number;
    description: string | null;
    minPurchaseAmount: number | null;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    usageCount: number;
    active: boolean;
    expiresAt: Date;
    applicableProducts: string[];
    applicableCategories: string[];
    applicableServices: string[];
    ownerId: string | null;
    isReward: boolean;
    isLoyaltyTemplate: boolean;
    sourceCouponId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

type CampaignRecord = {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    source: string;
    metric: string;
    targetValue: Prisma.Decimal;
    status: string;
    startsAt: Date;
    endsAt: Date;
    claimUntil: Date;
    rewardCouponId: string | null;
    rewardValidDays: number | null;
    maxClaims: number | null;
    claimedCount: number;
    createdAt: Date;
    updatedAt: Date;
};

type LedgerRecord = {
    id: string;
    tenantId: string;
    userId: string;
    sourceAppointmentId: string;
    points: number;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
};

type ClaimRecord = {
    id: string;
    tenantId: string;
    campaignId: string | null;
    userId: string;
    milestone: number | null;
    couponId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    coupon: CouponRecord | null;
};

type LedgerWhere = {
    tenantId: string;
    userId?: string;
    points?: { not: null };
};

type LedgerAppointmentWhere = {
    tenantId: string;
    sourceAppointmentId: string;
    points?: { not: null };
};

type LedgerCreateData = {
    tenantId: string;
    userId: string;
    sourceAppointmentId: string;
    points: number;
    reason: string;
    createdAt?: Date;
};

type ClaimWhere = {
    tenantId: string;
    userId: string;
    campaignId?: string | null;
    milestone?: { not: null } | null;
};

type ClaimCreateData = {
    tenantId: string;
    userId: string;
    campaignId?: string;
    milestone?: number | null;
    couponId: string;
    status: LoyaltyRewardClaimStatus;
};

type CampaignCreateData = {
    tenantId: string;
    name: string;
    description: string | null;
    source: LoyaltyCampaignSource;
    metric: LoyaltyCampaignMetric;
    targetValue: Prisma.Decimal;
    status: LoyaltyCampaignStatus;
    startsAt: Date;
    endsAt: Date;
    claimUntil: Date;
    rewardCouponId: string | null;
    rewardValidDays: number | null;
    maxClaims: number | null;
};

type CampaignUpdateData = {
    name?: string;
    description?: string | null;
    source?: LoyaltyCampaignSource;
    metric?: LoyaltyCampaignMetric;
    targetValue?: Prisma.Decimal;
    startsAt?: Date;
    endsAt?: Date;
    claimUntil?: Date;
    rewardCouponId?: string;
    rewardValidDays?: number;
    maxClaims?: number | null;
};

type RewardCouponWhere = {
    id: string;
    tenantId: string;
    ownerId: null;
    isReward?: false;
    isLoyaltyTemplate?: true;
    active: boolean;
    expiresAt: { gte: Date };
};

type RewardCouponCreateData = {
    tenantId: string;
    code: string;
    type: CouponType;
    value: number;
    description: string | null;
    minPurchaseAmount: number | null;
    maxDiscountAmount: number | null;
    usageLimit: number;
    usageCount: number;
    active: boolean;
    expiresAt: Date;
    applicableProducts: string[];
    applicableCategories: string[];
    applicableServices: string[];
    ownerId: string;
    isReward: true;
    isLoyaltyTemplate: false;
    sourceCouponId: string;
};

type LoyaltyLedgerDelegate = {
    findMany(args: {
        where: LedgerWhere;
        orderBy: { createdAt: "desc" };
        take?: number;
    }): Promise<LedgerRecord[]>;
    findFirst(args: {
        where: LedgerAppointmentWhere;
    }): Promise<LedgerRecord | null>;
    upsert(args: {
        where: { tenantId_sourceAppointmentId: LedgerAppointmentWhere };
        create: LedgerCreateData;
        update: Record<string, never>;
    }): Promise<LedgerRecord>;
    aggregate(args: {
        where: {
            tenantId: string;
            userId?: string;
            campaignId?: string | null;
            points?: { not: null };
        };
        _sum: {
            points?: true;
            value?: true;
        };
    }): Promise<{
        _sum: {
            points?: number | null;
            value?: Prisma.Decimal | null;
        };
    }>;
};

type LoyaltyCampaignDelegate = {
    create(args: { data: CampaignCreateData }): Promise<CampaignRecord>;
    findMany(args: {
        where: { tenantId: string };
        orderBy: { createdAt: "desc" };
    }): Promise<CampaignRecord[]>;
    findFirst(args: {
        where: Record<string, unknown>;
        orderBy?: { startsAt: "desc" };
    }): Promise<CampaignRecord | null>;
    updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
    }): Promise<{ count: number }>;
    deleteMany(args: {
        where: {
            id: string;
            tenantId: string;
            status: LoyaltyCampaignStatus;
        };
    }): Promise<{ count: number }>;
};

type LoyaltyRewardClaimDelegate = {
    findFirst(args: {
        where: ClaimWhere;
        include: { coupon: true };
    }): Promise<ClaimRecord | null>;
    findMany(args: {
        where: { tenantId: string; milestone?: { not: null } };
        orderBy: { createdAt: "desc" };
        include: { coupon: true };
        take?: number;
    }): Promise<ClaimRecord[]>;
    count(args: {
        where: {
            tenantId: string;
            campaignId?: string | null;
            milestone?: { not: null };
        };
    }): Promise<number>;
    create(args: {
        data: ClaimCreateData;
        include: { coupon: true };
    }): Promise<ClaimRecord>;
};

type RewardCouponDelegate = {
    findFirst(args: {
        where: RewardCouponWhere;
    }): Promise<CouponRecord | null>;
    create(args: {
        data: RewardCouponCreateData;
    }): Promise<CouponRecord>;
};

type LoyaltyTransaction = {
    loyaltyLedgerEntry: LoyaltyLedgerDelegate;
    loyaltyCampaign: LoyaltyCampaignDelegate;
    loyaltyRewardClaim: LoyaltyRewardClaimDelegate;
    coupon: RewardCouponDelegate;
};

type LoyaltyDatabase = LoyaltyTransaction & {
    $transaction<T>(
        callback: (tx: LoyaltyTransaction) => Promise<T>,
    ): Promise<T>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function hasMethods(value: unknown, methods: readonly string[]): boolean {
    if (!isRecord(value)) return false;
    return methods.every((method) => typeof value[method] === "function");
}

function isLoyaltyDatabase(value: unknown): value is LoyaltyDatabase {
    return (
        isRecord(value) &&
        hasMethods(value.loyaltyLedgerEntry, [
            "findMany",
            "findFirst",
            "upsert",
            "aggregate",
        ]) &&
        hasMethods(value.loyaltyCampaign, [
            "create",
            "findMany",
            "findFirst",
            "updateMany",
            "deleteMany",
        ]) &&
        hasMethods(value.loyaltyRewardClaim, [
            "findFirst",
            "findMany",
            "count",
            "create",
        ]) &&
        hasMethods(value.coupon, ["findFirst", "create"]) &&
        typeof value.$transaction === "function"
    );
}

function toCouponType(value: string): CouponType {
    if (value === CouponType.PERCENT || value === CouponType.FIXED) {
        return value;
    }
    throw new Error(`Unsupported coupon type: ${value}`);
}

function toCampaignStatus(value: string): LoyaltyCampaignStatus {
    if (Object.values(LoyaltyCampaignStatus).includes(value as LoyaltyCampaignStatus)) {
        return value as LoyaltyCampaignStatus;
    }
    throw new Error(`Unsupported loyalty campaign status: ${value}`);
}

function toCampaignSource(value: string): LoyaltyCampaignSource {
    if (Object.values(LoyaltyCampaignSource).includes(value as LoyaltyCampaignSource)) {
        return value as LoyaltyCampaignSource;
    }
    throw new Error(`Unsupported loyalty campaign source: ${value}`);
}

function toCampaignMetric(value: string): LoyaltyCampaignMetric {
    if (Object.values(LoyaltyCampaignMetric).includes(value as LoyaltyCampaignMetric)) {
        return value as LoyaltyCampaignMetric;
    }
    throw new Error(`Unsupported loyalty campaign metric: ${value}`);
}

function toClaimStatus(value: string): LoyaltyRewardClaimStatus {
    if (value === LoyaltyRewardClaimStatus.CLAIMED) {
        return LoyaltyRewardClaimStatus.CLAIMED;
    }
    throw new Error(`Unsupported loyalty claim status: ${value}`);
}

function toFixedDecimalString(value: Prisma.Decimal): string {
    return new Prisma.Decimal(value).toFixed(2);
}

export class PrismaLoyaltyRepository implements ILoyaltyRepository {
    private readonly injectedDatabase?: LoyaltyDatabase;
    private resolvedDatabase?: LoyaltyDatabase;

    constructor(database?: LoyaltyDatabase) {
        this.injectedDatabase = database;
    }

    private get db(): LoyaltyDatabase {
        if (this.injectedDatabase) return this.injectedDatabase;
        if (this.resolvedDatabase) return this.resolvedDatabase;

        const candidate: unknown = prisma;
        if (!isLoyaltyDatabase(candidate)) {
            throw new Error(
                "Prisma client is stale; run prisma generate before using loyalty persistence",
            );
        }
        this.resolvedDatabase = candidate;
        return candidate;
    }

    private mapCoupon(row: CouponRecord): Coupon {
        return {
            id: row.id,
            code: row.code,
            type: toCouponType(row.type),
            value: row.value,
            description: row.description ?? undefined,
            ownerId: row.ownerId ?? undefined,
            isReward: row.isReward,
            sourceCouponId: row.sourceCouponId ?? undefined,
            minPurchaseAmount: row.minPurchaseAmount ?? undefined,
            maxDiscountAmount: row.maxDiscountAmount ?? undefined,
            usageLimit: row.usageLimit ?? undefined,
            usageCount: row.usageCount,
            active: row.active,
            expiresAt: row.expiresAt,
            applicableProducts: row.applicableProducts,
            applicableCategories: row.applicableCategories,
            applicableServices: row.applicableServices,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    private mapCampaign(row: CampaignRecord): LoyaltyCampaign {
        return {
            id: row.id,
            tenantId: row.tenantId,
            name: row.name,
            description: row.description ?? undefined,
            source: toCampaignSource(row.source),
            metric: toCampaignMetric(row.metric),
            targetValue: toFixedDecimalString(row.targetValue),
            status: toCampaignStatus(row.status),
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            claimUntil: row.claimUntil,
            rewardCouponId: row.rewardCouponId ?? undefined,
            rewardValidDays: row.rewardValidDays ?? undefined,
            maxClaims: row.maxClaims ?? undefined,
            claimedCount: row.claimedCount,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    private mapLedgerEntry(row: LedgerRecord): LoyaltyLedgerEntry {
        return {
            id: row.id,
            tenantId: row.tenantId,
            userId: row.userId,
            sourceAppointmentId: row.sourceAppointmentId,
            points: row.points,
            reason: row.reason,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    private mapClaim(row: ClaimRecord): LoyaltyRewardClaim {
        if (row.milestone === null) {
            throw new Error("Legacy loyalty claims require a milestone");
        }
        return {
            id: row.id,
            tenantId: row.tenantId,
            userId: row.userId,
            milestone: row.milestone,
            couponId: row.couponId,
            status: toClaimStatus(row.status),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            coupon: row.coupon ? this.mapCoupon(row.coupon) : undefined,
        };
    }

    private mapCampaignClaim(row: ClaimRecord): LoyaltyCampaignRewardClaim {
        if (!row.campaignId) {
            throw new Error("Campaign loyalty claims require a campaign");
        }
        return {
            id: row.id,
            tenantId: row.tenantId,
            campaignId: row.campaignId,
            userId: row.userId,
            couponId: row.couponId,
            status: toClaimStatus(row.status),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            coupon: row.coupon ? this.mapCoupon(row.coupon) : undefined,
        };
    }

    private toClaimResult(row: ClaimRecord): LoyaltyRewardClaimResult {
        if (!row.coupon) {
            throw new EntityNotFoundError("Coupon", row.couponId);
        }
        return {
            claim: this.mapClaim(row),
            coupon: this.mapCoupon(row.coupon),
        };
    }

    private toCampaignClaimResult(row: ClaimRecord): LoyaltyCampaignClaimResult {
        if (!row.coupon) {
            throw new EntityNotFoundError("Coupon", row.couponId);
        }
        return {
            claim: this.mapCampaignClaim(row),
            coupon: this.mapCoupon(row.coupon),
        };
    }

    private validateIdentity(...values: string[]): void {
        if (values.some((value) => !value || !value.trim())) {
            throw new ValidationError(
                "Loyalty campaign identifiers are required",
                "MISSING_REQUIRED_FIELDS",
            );
        }
    }

    private validateCampaignFields(data: {
        name: string;
        source: LoyaltyCampaignSource;
        metric: LoyaltyCampaignMetric;
        targetValue: string;
        startsAt: Date;
        endsAt: Date;
        claimUntil: Date;
        rewardCouponId?: string;
        rewardValidDays?: number;
        maxClaims?: number | null;
    }): void {
        if (!data.name?.trim()) {
            throw new ValidationError("Campaign name is required", "INVALID_CAMPAIGN_NAME");
        }
        if (!Object.values(LoyaltyCampaignSource).includes(data.source)) {
            throw new ValidationError("Invalid campaign source", "INVALID_CAMPAIGN_SOURCE");
        }
        if (!isValidLoyaltyCampaignTarget(data.metric, data.targetValue)) {
            throw new ValidationError(
                "Campaign target must be a positive decimal and COUNT targets must be integers",
                "INVALID_CAMPAIGN_TARGET",
            );
        }
        if (!isValidLoyaltyCampaignDates(data.startsAt, data.endsAt, data.claimUntil)) {
            throw new ValidationError(
                "Campaign dates must satisfy startsAt < endsAt <= claimUntil",
                "INVALID_CAMPAIGN_DATES",
            );
        }
        if (!data.rewardCouponId?.trim()) {
            throw new ValidationError(
                "Campaign reward template is required",
                "INVALID_LOYALTY_REWARD_TEMPLATE",
            );
        }
        if (!isValidLoyaltyRewardValidDays(data.rewardValidDays)) {
            throw new ValidationError(
                "Campaign reward validity must be a positive integer",
                "INVALID_LOYALTY_REWARD_VALIDITY",
            );
        }
        if (
            data.maxClaims !== undefined &&
            data.maxClaims !== null &&
            !isValidLoyaltyCampaignMaxClaims(data.maxClaims)
        ) {
            throw new ValidationError(
                "Campaign maxClaims must be a positive integer",
                "INVALID_CAMPAIGN_MAX_CLAIMS",
            );
        }
    }

    private async validateRewardTemplate(
        tenantId: string,
        rewardCouponId: string,
        claimUntil: Date,
    ): Promise<void> {
        const template = await this.db.coupon.findFirst({
            where: {
                id: rewardCouponId,
                tenantId,
                ownerId: null,
                isReward: false,
                isLoyaltyTemplate: true,
                active: true,
                expiresAt: { gte: claimUntil },
            },
        });
        if (!template) {
            throw new BusinessRuleViolationError(
                "The campaign reward template must be an active shared loyalty template for this tenant through claimUntil",
                "INVALID_LOYALTY_REWARD_TEMPLATE",
            );
        }
    }

    async createCampaign(
        tenantId: string,
        data: CreateLoyaltyCampaignData,
    ): Promise<LoyaltyCampaign> {
        this.validateIdentity(tenantId);
        this.validateCampaignFields(data);
        await this.validateRewardTemplate(
            tenantId,
            data.rewardCouponId,
            data.claimUntil,
        );
        const row = await this.db.loyaltyCampaign.create({
            data: {
                tenantId,
                name: data.name.trim(),
                description: data.description?.trim() || null,
                source: data.source,
                metric: data.metric,
                targetValue: new Prisma.Decimal(data.targetValue),
                status: LoyaltyCampaignStatus.DRAFT,
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                claimUntil: data.claimUntil,
                rewardCouponId: data.rewardCouponId.trim(),
                rewardValidDays: data.rewardValidDays,
                maxClaims: data.maxClaims ?? null,
            },
        });
        return this.mapCampaign(row);
    }

    async updateCampaign(
        tenantId: string,
        campaignId: string,
        data: UpdateLoyaltyCampaignData,
    ): Promise<LoyaltyCampaign> {
        this.validateIdentity(tenantId, campaignId);
        const current = await this.getCampaign(tenantId, campaignId);
        if (!current) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        if (current.status !== LoyaltyCampaignStatus.DRAFT) {
            throw new BusinessRuleViolationError(
                "Only DRAFT loyalty campaigns can be updated",
                "LOYALTY_CAMPAIGN_NOT_DRAFT",
            );
        }

        const candidate = {
            name: data.name ?? current.name,
            source: data.source ?? current.source,
            metric: data.metric ?? current.metric,
            targetValue: data.targetValue ?? current.targetValue,
            startsAt: data.startsAt ?? current.startsAt,
            endsAt: data.endsAt ?? current.endsAt,
            claimUntil: data.claimUntil ?? current.claimUntil,
            rewardCouponId: data.rewardCouponId ?? current.rewardCouponId,
            rewardValidDays: data.rewardValidDays ?? current.rewardValidDays,
            maxClaims:
                data.maxClaims === undefined
                    ? current.maxClaims ?? null
                    : data.maxClaims,
        };
        this.validateCampaignFields(candidate);
        if (
            candidate.maxClaims !== null &&
            candidate.maxClaims < current.claimedCount
        ) {
            throw new ValidationError(
                "Campaign maxClaims cannot be lower than claimedCount",
                "INVALID_CAMPAIGN_MAX_CLAIMS",
            );
        }
        await this.validateRewardTemplate(
            tenantId,
            candidate.rewardCouponId!,
            candidate.claimUntil,
        );

        const updateData: CampaignUpdateData = {};
        if (data.name !== undefined) updateData.name = data.name.trim();
        if (data.description !== undefined) {
            updateData.description = data.description?.trim() || null;
        }
        if (data.source !== undefined) updateData.source = data.source;
        if (data.metric !== undefined) updateData.metric = data.metric;
        if (data.targetValue !== undefined) {
            updateData.targetValue = new Prisma.Decimal(data.targetValue);
        }
        if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
        if (data.endsAt !== undefined) updateData.endsAt = data.endsAt;
        if (data.claimUntil !== undefined) updateData.claimUntil = data.claimUntil;
        if (data.rewardCouponId !== undefined) {
            updateData.rewardCouponId = data.rewardCouponId.trim();
        }
        if (data.rewardValidDays !== undefined) {
            updateData.rewardValidDays = data.rewardValidDays;
        }
        if (data.maxClaims !== undefined) updateData.maxClaims = data.maxClaims;

        const result = await this.db.loyaltyCampaign.updateMany({
            where: {
                id: campaignId,
                tenantId,
                status: LoyaltyCampaignStatus.DRAFT,
            },
            data: updateData,
        });
        if (result.count === 0) {
            throw new BusinessRuleViolationError(
                "The loyalty campaign is no longer DRAFT",
                "LOYALTY_CAMPAIGN_NOT_DRAFT",
            );
        }
        const updated = await this.getCampaign(tenantId, campaignId);
        if (!updated) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        return updated;
    }

    async deleteCampaign(tenantId: string, campaignId: string): Promise<void> {
        this.validateIdentity(tenantId, campaignId);
        const current = await this.getCampaign(tenantId, campaignId);
        if (!current) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        if (current.status !== LoyaltyCampaignStatus.DRAFT) {
            throw new BusinessRuleViolationError(
                "Only DRAFT loyalty campaigns can be deleted",
                "LOYALTY_CAMPAIGN_NOT_DRAFT",
            );
        }
        const result = await this.db.loyaltyCampaign.deleteMany({
            where: {
                id: campaignId,
                tenantId,
                status: LoyaltyCampaignStatus.DRAFT,
            },
        });
        if (result.count === 0) {
            throw new BusinessRuleViolationError(
                "The loyalty campaign is no longer DRAFT",
                "LOYALTY_CAMPAIGN_NOT_DRAFT",
            );
        }
    }

    async listCampaigns(tenantId: string): Promise<LoyaltyCampaign[]> {
        this.validateIdentity(tenantId);
        const rows = await this.db.loyaltyCampaign.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((row) => this.mapCampaign(row));
    }

    async getCampaign(
        tenantId: string,
        campaignId: string,
    ): Promise<LoyaltyCampaign | null> {
        this.validateIdentity(tenantId, campaignId);
        const row = await this.db.loyaltyCampaign.findFirst({
            where: { id: campaignId, tenantId },
        });
        return row ? this.mapCampaign(row) : null;
    }

    async findActiveCampaignAt(
        tenantId: string,
        sourceType: LoyaltySourceType,
        at: Date,
    ): Promise<LoyaltyCampaign | null> {
        this.validateIdentity(tenantId);
        if (!(at instanceof Date) || !Number.isFinite(at.getTime())) {
            throw new ValidationError("Campaign lookup date is invalid", "INVALID_CAMPAIGN_DATE");
        }
        let source: LoyaltyCampaignSource | null = null;
        if (sourceType === LoyaltySourceType.APPOINTMENT) {
            source = LoyaltyCampaignSource.BOOKING;
        } else if (sourceType === LoyaltySourceType.ORDER) {
            source = LoyaltyCampaignSource.STORE;
        }
        if (!source) {
            throw new ValidationError(
                "Campaign source type is invalid",
                "INVALID_LOYALTY_SOURCE_TYPE",
            );
        }
        const row = await this.db.loyaltyCampaign.findFirst({
            where: {
                tenantId,
                status: LoyaltyCampaignStatus.ACTIVE,
                source: { in: [source, LoyaltyCampaignSource.ALL] },
                startsAt: { lte: at },
                endsAt: { gt: at },
            },
            orderBy: { startsAt: "desc" },
        });
        return row ? this.mapCampaign(row) : null;
    }

    async getCampaignProgress(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<LoyaltyCampaignProgress> {
        this.validateIdentity(tenantId, campaignId, userId);
        const campaign = await this.getCampaign(tenantId, campaignId);
        if (!campaign) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        const aggregate = await this.db.loyaltyLedgerEntry.aggregate({
            where: { tenantId, campaignId, userId },
            _sum: { value: true },
        });
        const progressValue = getLoyaltyCampaignProgressValue(
            campaign.metric,
            toFixedDecimalString(aggregate._sum.value ?? new Prisma.Decimal(0)),
        );
        return {
            campaignId,
            userId,
            metric: campaign.metric,
            progressValue,
            targetValue: campaign.targetValue,
            reachedTarget: new Prisma.Decimal(progressValue).gte(
                new Prisma.Decimal(campaign.targetValue),
            ),
        };
    }

    async getCampaignStats(
        tenantId: string,
        campaignId: string,
    ): Promise<LoyaltyCampaignStats> {
        this.validateIdentity(tenantId, campaignId);
        const campaign = await this.getCampaign(tenantId, campaignId);
        if (!campaign) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        const claimedCount = campaign.claimedCount;
        const maxClaims = campaign.maxClaims ?? null;
        return {
            campaignId,
            claimedCount,
            maxClaims,
            remainingClaims:
                maxClaims === null ? null : Math.max(maxClaims - claimedCount, 0),
        };
    }

    async transitionCampaignStatus(
        tenantId: string,
        campaignId: string,
        from: LoyaltyCampaignStatus,
        to: LoyaltyCampaignStatus,
    ): Promise<LoyaltyCampaign | null> {
        this.validateIdentity(tenantId, campaignId);
        if (!canTransitionLoyaltyCampaignStatus(from, to)) {
            throw new BusinessRuleViolationError(
                `Invalid loyalty campaign transition: ${from} -> ${to}`,
                "INVALID_LOYALTY_CAMPAIGN_TRANSITION",
            );
        }

        const current = await this.getCampaign(tenantId, campaignId);
        if (!current) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        if (current.status !== from) return null;

        const now = new Date();
        if (
            to === LoyaltyCampaignStatus.ARCHIVED &&
            now.getTime() < current.claimUntil.getTime()
        ) {
            throw new BusinessRuleViolationError(
                "A campaign can be archived only at or after claimUntil",
                "LOYALTY_CAMPAIGN_ARCHIVE_TOO_EARLY",
            );
        }
        if (
            from === LoyaltyCampaignStatus.DRAFT &&
            to === LoyaltyCampaignStatus.ACTIVE
        ) {
            this.validateCampaignFields({
                name: current.name,
                source: current.source,
                metric: current.metric,
                targetValue: current.targetValue,
                startsAt: current.startsAt,
                endsAt: current.endsAt,
                claimUntil: current.claimUntil,
                rewardCouponId: current.rewardCouponId,
                rewardValidDays: current.rewardValidDays,
                maxClaims: current.maxClaims ?? null,
            });
            if (
                current.maxClaims !== undefined &&
                current.maxClaims < current.claimedCount
            ) {
                throw new ValidationError(
                    "Campaign maxClaims cannot be lower than claimedCount",
                    "INVALID_CAMPAIGN_MAX_CLAIMS",
                );
            }
            await this.validateRewardTemplate(
                tenantId,
                current.rewardCouponId!,
                current.claimUntil,
            );
        }

        const result = await this.db.loyaltyCampaign.updateMany({
            where: { id: campaignId, tenantId, status: from },
            data: { status: to },
        });
        if (result.count === 0) return null;
        return this.getCampaign(tenantId, campaignId);
    }

    async claimCampaignReward(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<LoyaltyCampaignClaimResult> {
        this.validateIdentity(tenantId, campaignId, userId);

        try {
            return await this.db.$transaction(async (tx) => {
                const claimAt = new Date();
                const existing = await tx.loyaltyRewardClaim.findFirst({
                    where: { tenantId, campaignId, userId },
                    include: { coupon: true },
                });
                if (existing) return this.toCampaignClaimResult(existing);

                const campaignRow = await tx.loyaltyCampaign.findFirst({
                    where: { id: campaignId, tenantId },
                });
                if (!campaignRow) {
                    throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
                }
                const campaign = this.mapCampaign(campaignRow);
                if (
                    !isLoyaltyCampaignClaimable(
                        campaign.status,
                        campaign.startsAt,
                        campaign.claimUntil,
                        claimAt,
                    )
                ) {
                    throw new BusinessRuleViolationError(
                        "The campaign is not claimable at this time",
                        "LOYALTY_CAMPAIGN_NOT_CLAIMABLE",
                    );
                }
                if (
                    !campaign.rewardCouponId ||
                    !isValidLoyaltyRewardValidDays(campaign.rewardValidDays)
                ) {
                    throw new BusinessRuleViolationError(
                        "The campaign reward is not configured",
                        "INVALID_LOYALTY_REWARD_TEMPLATE",
                    );
                }

                const progress = await tx.loyaltyLedgerEntry.aggregate({
                    where: { tenantId, campaignId, userId },
                    _sum: { value: true },
                });
                const netTotal = progress._sum.value ?? new Prisma.Decimal(0);
                if (!new Prisma.Decimal(netTotal).gte(new Prisma.Decimal(campaign.targetValue))) {
                    throw new BusinessRuleViolationError(
                        "The loyalty campaign target has not been reached",
                        "LOYALTY_TARGET_NOT_REACHED",
                    );
                }

                const template = await tx.coupon.findFirst({
                    where: {
                        id: campaign.rewardCouponId,
                        tenantId,
                        ownerId: null,
                        isReward: false,
                        isLoyaltyTemplate: true,
                        active: true,
                        expiresAt: { gte: campaign.claimUntil },
                    },
                });
                if (!template) {
                    throw new BusinessRuleViolationError(
                        "The campaign reward template is inactive, expired, or not shared",
                        "INVALID_LOYALTY_REWARD_TEMPLATE",
                    );
                }

                const maxClaims = campaign.maxClaims ?? null;
                const reservation = await tx.loyaltyCampaign.updateMany({
                    where: {
                        id: campaignId,
                        tenantId,
                        startsAt: { lte: claimAt },
                        claimUntil: { gt: claimAt },
                        status: {
                            in: [
                                LoyaltyCampaignStatus.ACTIVE,
                                LoyaltyCampaignStatus.ENDED,
                            ],
                        },
                        ...(maxClaims === null
                            ? {}
                            : { claimedCount: { lt: maxClaims } }),
                    },
                    data: { claimedCount: { increment: 1 } },
                });
                if (reservation.count === 0) {
                    const winner = await tx.loyaltyRewardClaim.findFirst({
                        where: { tenantId, campaignId, userId },
                        include: { coupon: true },
                    });
                    if (winner) return this.toCampaignClaimResult(winner);
                    throw new BusinessRuleViolationError(
                        "The campaign has reached its claim limit",
                        "LOYALTY_CAMPAIGN_CLAIM_LIMIT_REACHED",
                    );
                }

                const expiresAt = new Date(claimAt);
                expiresAt.setUTCDate(
                    expiresAt.getUTCDate() + campaign.rewardValidDays!,
                );
                if (!Number.isFinite(expiresAt.getTime())) {
                    throw new ValidationError(
                        "Campaign reward validity produces an invalid expiry date",
                        "INVALID_LOYALTY_REWARD_VALIDITY",
                    );
                }

                const coupon = await tx.coupon.create({
                    data: {
                        tenantId,
                        code: `LOYALTY-${randomUUID().replace(/-/g, "").toUpperCase()}`,
                        type: toCouponType(template.type),
                        value: template.value,
                        description: template.description,
                        minPurchaseAmount: template.minPurchaseAmount,
                        maxDiscountAmount: template.maxDiscountAmount,
                        usageLimit: 1,
                        usageCount: 0,
                        active: true,
                        expiresAt,
                        applicableProducts: template.applicableProducts,
                        applicableCategories: template.applicableCategories,
                        applicableServices: template.applicableServices,
                        ownerId: userId,
                        isReward: true,
                        isLoyaltyTemplate: false,
                        sourceCouponId: template.id,
                    },
                });
                const claim = await tx.loyaltyRewardClaim.create({
                    data: {
                        tenantId,
                        campaignId,
                        userId,
                        milestone: null,
                        couponId: coupon.id,
                        status: LoyaltyRewardClaimStatus.CLAIMED,
                    },
                    include: { coupon: true },
                });
                return this.toCampaignClaimResult(claim);
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const existing = await this.db.loyaltyRewardClaim.findFirst({
                    where: { tenantId, campaignId, userId },
                    include: { coupon: true },
                });
                if (existing) return this.toCampaignClaimResult(existing);
            }
            throw error;
        }
    }

    async findLedgerEntries(
        tenantId: string,
        userId?: string,
    ): Promise<LoyaltyLedgerEntry[]> {
        const rows = await this.db.loyaltyLedgerEntry.findMany({
            where: {
                tenantId,
                points: { not: null },
                ...(userId ? { userId } : {}),
            },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((row) => this.mapLedgerEntry(row));
    }

    async findLedgerEntryByAppointment(
        tenantId: string,
        sourceAppointmentId: string,
    ): Promise<LoyaltyLedgerEntry | null> {
        const row = await this.db.loyaltyLedgerEntry.findFirst({
            where: { tenantId, sourceAppointmentId, points: { not: null } },
        });
        return row ? this.mapLedgerEntry(row) : null;
    }

    async insertLedgerEntry(
        tenantId: string,
        data: CreateLoyaltyLedgerEntryData,
    ): Promise<LoyaltyLedgerEntry> {
        if (!data.userId || !data.sourceAppointmentId) {
            throw new ValidationError(
                "Loyalty ledger entries require a user and source appointment",
            );
        }
        if (!Number.isInteger(data.points) || data.points <= 0) {
            throw new ValidationError(
                "Loyalty points must be a positive integer",
            );
        }
        if (!data.reason.trim()) {
            throw new ValidationError("Loyalty reason is required");
        }

        const row = await this.db.loyaltyLedgerEntry.upsert({
            where: {
                tenantId_sourceAppointmentId: {
                    tenantId,
                    sourceAppointmentId: data.sourceAppointmentId,
                },
            },
            create: {
                tenantId,
                userId: data.userId,
                sourceAppointmentId: data.sourceAppointmentId,
                points: data.points,
                reason: data.reason,
                ...(data.createdAt ? { createdAt: data.createdAt } : {}),
            },
            update: {},
        });
        return this.mapLedgerEntry(row);
    }

    async getPointsBalance(tenantId: string, userId: string): Promise<number> {
        const result = await this.db.loyaltyLedgerEntry.aggregate({
            where: { tenantId, userId, points: { not: null } },
            _sum: { points: true },
        });
        return result._sum.points ?? 0;
    }

    async findRewardClaim(
        tenantId: string,
        userId: string,
        _milestone?: number,
    ): Promise<LoyaltyRewardClaim | null> {
        const row = await this.db.loyaltyRewardClaim.findFirst({
            where: { tenantId, userId, milestone: { not: null } },
            include: { coupon: true },
        });
        return row ? this.mapClaim(row) : null;
    }

    async findRecentLedgerEntries(
        tenantId: string,
        limit = 20,
    ): Promise<LoyaltyLedgerEntry[]> {
        const rows = await this.db.loyaltyLedgerEntry.findMany({
            where: { tenantId, points: { not: null } },
            orderBy: { createdAt: "desc" },
            take: Math.max(1, Math.min(100, limit)),
        });
        return rows.map((row) => this.mapLedgerEntry(row));
    }

    async findRecentRewardClaims(
        tenantId: string,
        limit = 20,
    ): Promise<LoyaltyRewardClaim[]> {
        const rows = await this.db.loyaltyRewardClaim.findMany({
            where: { tenantId, milestone: { not: null } },
            orderBy: { createdAt: "desc" },
            include: { coupon: true },
            take: Math.max(1, Math.min(100, limit)),
        });
        return rows.map((row) => this.mapClaim(row));
    }

    async getTenantStats(tenantId: string): Promise<LoyaltyTenantStats> {
        const [points, totalClaims, entries] = await Promise.all([
            this.db.loyaltyLedgerEntry.aggregate({
                where: { tenantId, points: { not: null } },
                _sum: { points: true },
            }),
            this.db.loyaltyRewardClaim.count({ where: { tenantId, milestone: { not: null } } }),
            this.db.loyaltyLedgerEntry.findMany({
                where: { tenantId, points: { not: null } },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        return {
            tenantId,
            totalPoints: points._sum.points ?? 0,
            totalClaims,
            activeCustomers: new Set(entries.map((entry) => entry.userId)).size,
        };
    }

    async claimReward(
        tenantId: string,
        userId: string,
        templateCouponId: string,
        milestoneOrCode?: number | string,
        code?: string,
    ): Promise<LoyaltyRewardClaimResult> {
        const milestone =
            typeof milestoneOrCode === "number"
                ? milestoneOrCode
                : LOYALTY_REWARD_MILESTONE;
        const rewardCode =
            typeof milestoneOrCode === "string" ? milestoneOrCode : code;
        if (
            !tenantId ||
            !userId ||
            typeof templateCouponId !== "string" ||
            !templateCouponId.trim()
        ) {
            throw new ValidationError(
                "Loyalty claim requires tenant, user, and template identifiers",
                "MISSING_REQUIRED_FIELDS",
            );
        }
        if (!isValidLoyaltyTargetPoints(milestone)) {
            throw new ValidationError(
                "Loyalty milestone must be a positive safe integer",
                "INVALID_LOYALTY_TARGET_POINTS",
            );
        }

        try {
            return await this.db.$transaction(async (tx) => {
                const existing = await tx.loyaltyRewardClaim.findFirst({
                    where: {
                        tenantId,
                        userId,
                        milestone: { not: null },
                    },
                    include: { coupon: true },
                });
                if (existing) {
                    return this.toClaimResult(existing);
                }

                const balance = await tx.loyaltyLedgerEntry.aggregate({
                    where: { tenantId, userId, points: { not: null } },
                    _sum: { points: true },
                });
                if ((balance._sum.points ?? 0) < milestone) {
                    throw new BusinessRuleViolationError(
                        "The loyalty target has not been reached",
                        "LOYALTY_TARGET_NOT_REACHED",
                    );
                }

                const now = new Date();
                const template = await tx.coupon.findFirst({
                    where: {
                        id: templateCouponId,
                        tenantId,
                        ownerId: null,
                        isReward: false,
                        active: true,
                        expiresAt: { gte: now },
                    },
                });
                if (!template) {
                    throw new EntityNotFoundError("Coupon", templateCouponId);
                }
                const expiresAt = new Date(template.expiresAt).getTime();
                if (
                    !template.active ||
                    !Number.isFinite(expiresAt) ||
                    expiresAt <= Date.now()
                ) {
                    throw new BusinessRuleViolationError(
                        "The loyalty reward template is inactive or expired",
                        "INVALID_LOYALTY_REWARD_TEMPLATE",
                    );
                }

                const coupon = await tx.coupon.create({
                    data: {
                        tenantId,
                        code:
                            rewardCode?.trim().toUpperCase() ||
                            `LOYALTY-${randomUUID().replace(/-/g, "").toUpperCase()}`,
                        type: toCouponType(template.type),
                        value: template.value,
                        description: template.description,
                        minPurchaseAmount: template.minPurchaseAmount,
                        maxDiscountAmount: template.maxDiscountAmount,
                        usageLimit: 1,
                        usageCount: 0,
                        active: true,
                        expiresAt: template.expiresAt,
                        applicableProducts: template.applicableProducts,
                        applicableCategories: template.applicableCategories,
                        applicableServices: template.applicableServices,
                        ownerId: userId,
                        isReward: true,
                        isLoyaltyTemplate: false,
                        sourceCouponId: template.id,
                    },
                });
                const claim = await tx.loyaltyRewardClaim.create({
                    data: {
                        tenantId,
                        userId,
                        milestone,
                        couponId: coupon.id,
                        status: LoyaltyRewardClaimStatus.CLAIMED,
                    },
                    include: { coupon: true },
                });
                return this.toClaimResult(claim);
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const existing = await this.findRewardClaim(tenantId, userId);
                if (existing?.coupon) {
                    return {
                        claim: existing,
                        coupon: existing.coupon,
                    };
                }
            }
            throw error;
        }
    }
}
