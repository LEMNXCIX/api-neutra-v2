import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    CreateLoyaltyCampaignData,
    ILoyaltyRepository,
    LoyaltyCampaignClaimResult,
    LoyaltyCampaignRewardDefinition,
    UpdateLoyaltyCampaignData,
} from "@/core/repositories/loyalty.repository.interface";
import {
    LoyaltyCampaign,
    LoyaltyCampaignMetric,
    LoyaltyCampaignReward,
    LoyaltyCampaignProgress,
    LoyaltyCampaignRewardClaim,
    LoyaltyCampaignSource,
    LoyaltyCampaignStats,
    LoyaltyCampaignStatus,
    LoyaltyLedgerEntryType,
    LoyaltyRewardClaimStatus,
    LoyaltySourceType,
} from "@/core/entities/loyalty.entity";
import {
    assertLoyaltyCampaignDraft,
    assertLoyaltyCampaignRewardConfigured,
    assertLoyaltyCampaignRewardProvided,
    assertLoyaltyRewardTemplate,
    canTransitionLoyaltyCampaignStatus,
    getLoyaltyCampaignProgressValue,
    getLoyaltyCampaignSourceTypes,
    isLoyaltyCampaignClaimable,
    isValidLoyaltyCampaignDates,
    isValidLoyaltyCampaignMaxClaims,
    isValidLoyaltyCampaignTarget,
    isValidLoyaltyRewardValidDays,
    rejectLoyaltyRewardTemplate,
} from "@/core/domain/loyalty/loyalty.policy";
import { CouponType } from "@/core/entities/coupon.entity";
import {
    mapCoupon,
    toCouponType,
} from "@/infrastructure/database/prisma/coupon-mapper";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { LoyaltyErrorCodes, ValidationErrorCodes } from "@/types/error-codes";

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
    rewardCoupon?: CouponRecord | null;
};

type ClaimRecord = {
    id: string;
    tenantId: string;
    campaignId: string;
    userId: string;
    couponId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    coupon: CouponRecord | null;
};

type ClaimWhere = {
    tenantId: string;
    campaignId: string;
    userId: string;
};

type ClaimCreateData = {
    tenantId: string;
    campaignId: string;
    userId: string;
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
    id?: string;
    tenantId: string;
    ownerId: null | { not: null };
    isReward?: boolean;
    isLoyaltyTemplate?: boolean;
    active?: boolean;
    usageCount?: number;
    expiresAt?: { gte?: Date; gt?: Date };
};

type RewardCouponCreateData = {
    tenantId: string;
    code: string;
    type: CouponType;
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
};

type LoyaltyLedgerWhere = {
    tenantId: string;
    /** A single campaign, or a set for the batched progress read. */
    campaignId: string | { in: string[] };
    userId: string;
    sourceType: { in: LoyaltySourceType[] };
    entryType:
        | LoyaltyLedgerEntryType
        | { in: LoyaltyLedgerEntryType[] };
};

type LoyaltyLedgerDelegate = {
    count(args: { where: LoyaltyLedgerWhere }): Promise<number>;
    aggregate(args: {
        where: LoyaltyLedgerWhere;
        _sum: { value: true };
    }): Promise<{
        _sum: { value: Prisma.Decimal | null };
    }>;
    /**
     * Prisma exposes one heavily overloaded `groupBy`. These two call
     * signatures are the shapes this repository uses; they must both be called
     * `groupBy`, because a delegate assembled as an object literal here has to
     * stay callable as the real Prisma delegate it stands in for.
     */
    groupBy(args: {
        by: ["campaignId", "entryType"];
        where: LoyaltyLedgerWhere;
        _count: { _all: true };
    }): Promise<
        Array<{
            campaignId: string;
            entryType: LoyaltyLedgerEntryType;
            _count: { _all: number };
        }>
    >;
    groupBy(args: {
        by: ["campaignId"];
        where: LoyaltyLedgerWhere;
        _sum: { value: true };
    }): Promise<
        Array<{
            campaignId: string;
            _sum: { value: Prisma.Decimal | null };
        }>
    >;
};

type LoyaltyCampaignDelegate = {
    create(args: { data: CampaignCreateData }): Promise<CampaignRecord>;
    findMany(args: {
        where: { tenantId: string };
        include: { rewardCoupon: true };
        orderBy: { createdAt: "desc" };
    }): Promise<CampaignRecord[]>;
    findFirst(args: {
        where: Record<string, unknown>;
        include?: { rewardCoupon: true };
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
        where: {
            tenantId: string;
            userId: string;
            campaignId: { in: string[] };
        };
        include: { coupon: true };
    }): Promise<ClaimRecord[]>;
    count(args: { where: { tenantId: string } }): Promise<number>;
    create(args: {
        data: ClaimCreateData;
        include: { coupon: true };
    }): Promise<ClaimRecord>;
};

type RewardCouponUpdateData = Partial<
    Omit<RewardCouponCreateData, "tenantId" | "code">
>;

type RewardCouponDelegate = {
    findFirst(args: {
        where: RewardCouponWhere;
    }): Promise<CouponRecord | null>;
    create(args: {
        data: RewardCouponCreateData;
    }): Promise<CouponRecord>;
    updateMany(args: {
        where: Record<string, unknown>;
        data: RewardCouponUpdateData;
    }): Promise<{ count: number }>;
    deleteMany(args: {
        where: Record<string, unknown>;
    }): Promise<{ count: number }>;
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
        hasMethods(value.loyaltyLedgerEntry, ["aggregate", "count"]) &&
        hasMethods(value.loyaltyCampaign, [
            "create",
            "findMany",
            "findFirst",
            "updateMany",
            "deleteMany",
        ]) &&
        hasMethods(value.loyaltyRewardClaim, ["findFirst", "create"]) &&
        hasMethods(value.coupon, [
            "findFirst",
            "create",
            "updateMany",
            "deleteMany",
        ]) &&
        typeof value.$transaction === "function"
    );
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

    private mapCampaignReward(
        row: CouponRecord | null | undefined,
    ): LoyaltyCampaignReward | undefined {
        if (!row) return undefined;
        return {
            type: toCouponType(row.type),
            value: row.value,
            description: row.description,
            minPurchaseAmount: row.minPurchaseAmount,
            maxDiscountAmount: row.maxDiscountAmount,
            applicableProducts: [...row.applicableProducts],
            applicableCategories: [...row.applicableCategories],
            applicableServices: [...row.applicableServices],
        };
    }

    private mapCampaign(row: CampaignRecord): LoyaltyCampaign {
        return {
            id: row.id,
            tenantId: row.tenantId,
            name: row.name,
            description: row.description,
            source: toCampaignSource(row.source),
            metric: toCampaignMetric(row.metric),
            targetValue: toFixedDecimalString(row.targetValue),
            status: toCampaignStatus(row.status),
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            claimUntil: row.claimUntil,
            rewardCouponId: row.rewardCouponId,
            reward: this.mapCampaignReward(row.rewardCoupon),
            rewardValidDays: row.rewardValidDays,
            maxClaims: row.maxClaims,
            claimedCount: row.claimedCount,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    private mapCampaignClaim(row: ClaimRecord): LoyaltyCampaignRewardClaim {
        return {
            id: row.id,
            tenantId: row.tenantId,
            campaignId: row.campaignId,
            userId: row.userId,
            couponId: row.couponId,
            status: toClaimStatus(row.status),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            coupon: row.coupon ? mapCoupon(row.coupon) : undefined,
        };
    }

    private toCampaignClaimResult(row: ClaimRecord): LoyaltyCampaignClaimResult {
        if (!row.coupon) {
            throw new EntityNotFoundError("Coupon", row.couponId);
        }
        return {
            claim: this.mapCampaignClaim(row),
            coupon: mapCoupon(row.coupon),
        };
    }

    private validateIdentity(...values: string[]): void {
        if (values.some((value) => !value || !value.trim())) {
            throw new ValidationError(
                "Loyalty campaign identifiers are required",
                ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
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
        rewardValidDays?: number | null;
        maxClaims?: number | null;
    }): void {
        if (!data.name?.trim()) {
            throw new ValidationError(
                "Campaign name is required",
                ValidationErrorCodes.INVALID_CAMPAIGN_NAME,
            );
        }
        if (!Object.values(LoyaltyCampaignSource).includes(data.source)) {
            throw new ValidationError(
                "Invalid campaign source",
                ValidationErrorCodes.INVALID_CAMPAIGN_SOURCE,
            );
        }
        if (!isValidLoyaltyCampaignTarget(data.metric, data.targetValue)) {
            throw new ValidationError(
                "Campaign target must be a positive decimal and COUNT targets must be integers",
                ValidationErrorCodes.INVALID_CAMPAIGN_TARGET,
            );
        }
        if (!isValidLoyaltyCampaignDates(data.startsAt, data.endsAt, data.claimUntil)) {
            throw new ValidationError(
                "Campaign dates must satisfy startsAt < endsAt <= claimUntil",
                ValidationErrorCodes.INVALID_CAMPAIGN_DATES,
            );
        }
        if (!isValidLoyaltyRewardValidDays(data.rewardValidDays)) {
            throw new ValidationError(
                "Campaign reward validity must be a positive integer",
                ValidationErrorCodes.INVALID_LOYALTY_REWARD_VALIDITY,
            );
        }
        if (
            data.maxClaims !== undefined &&
            data.maxClaims !== null &&
            !isValidLoyaltyCampaignMaxClaims(data.maxClaims)
        ) {
            throw new ValidationError(
                "Campaign maxClaims must be a positive integer",
                ValidationErrorCodes.INVALID_CAMPAIGN_MAX_CLAIMS,
            );
        }
    }

    private validateRewardDefinition(
        reward: LoyaltyCampaignRewardDefinition,
    ): void {
        assertLoyaltyRewardTemplate(reward);
    }

    private buildTemplateData(
        tenantId: string,
        reward: LoyaltyCampaignRewardDefinition,
        claimUntil: Date,
    ): RewardCouponCreateData {
        this.validateRewardDefinition(reward);
        return {
            tenantId,
            code: `LOYALTY-TEMPLATE-${randomUUID().replace(/-/g, "").toUpperCase()}`,
            type: reward.type,
            value: reward.value,
            description: reward.description?.trim() || null,
            minPurchaseAmount: reward.minPurchaseAmount ?? null,
            maxDiscountAmount: reward.maxDiscountAmount ?? null,
            usageLimit: null,
            usageCount: 0,
            active: true,
            expiresAt: new Date(claimUntil),
            applicableProducts: [...(reward.applicableProducts ?? [])],
            applicableCategories: [...(reward.applicableCategories ?? [])],
            applicableServices: [...(reward.applicableServices ?? [])],
            ownerId: null,
            isReward: false,
            isLoyaltyTemplate: true,
            sourceCouponId: null,
        };
    }

    private buildCampaignData(
        tenantId: string,
        data: CreateLoyaltyCampaignData,
        rewardCouponId: string,
    ): CampaignCreateData {
        return {
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
            rewardCouponId,
            rewardValidDays: data.rewardValidDays,
            maxClaims: data.maxClaims ?? null,
        };
    }

    private async updateTemplate(
        tx: LoyaltyTransaction,
        tenantId: string,
        templateId: string,
        data: RewardCouponUpdateData,
    ): Promise<void> {
        const result = await tx.coupon.updateMany({
            where: {
                id: templateId,
                tenantId,
                ownerId: null,
                isReward: false,
                isLoyaltyTemplate: true,
            },
            data,
        });
        if (result && result.count === 0) {
            rejectLoyaltyRewardTemplate(
                "The campaign reward template is no longer available",
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
            rejectLoyaltyRewardTemplate(
                "The campaign reward template must be an active shared loyalty template for this tenant through claimUntil",
            );
        }
    }

    async createCampaign(
        tenantId: string,
        data: CreateLoyaltyCampaignData,
    ): Promise<LoyaltyCampaign> {
        this.validateIdentity(tenantId);
        this.validateCampaignFields(data);
        if (!data.reward) {
            assertLoyaltyCampaignRewardProvided(data.reward);
        }
        this.validateRewardDefinition(data.reward);
        const row = await this.db.$transaction(async (tx) => {
            const template = await tx.coupon.create({
                data: this.buildTemplateData(
                    tenantId,
                    data.reward,
                    data.claimUntil,
                ),
            });
            const campaign = await tx.loyaltyCampaign.create({
                data: this.buildCampaignData(
                    tenantId,
                    data,
                    template.id,
                ),
            });
            return { ...campaign, rewardCoupon: template };
        });
        return this.mapCampaign(row);
    }

    async updateCampaign(
        tenantId: string,
        campaignId: string,
        data: UpdateLoyaltyCampaignData,
    ): Promise<LoyaltyCampaign> {
        this.validateIdentity(tenantId, campaignId);
        if (data.reward) this.validateRewardDefinition(data.reward);
        return this.updateCampaignAndTemplate(
            tenantId,
            campaignId,
            data,
            data.reward,
        );
    }

    private async updateCampaignAndTemplate(
        tenantId: string,
        campaignId: string,
        data: UpdateLoyaltyCampaignData,
        reward: LoyaltyCampaignRewardDefinition | undefined,
    ): Promise<LoyaltyCampaign> {
        return this.db.$transaction(async (tx) => {
            const currentRow = await tx.loyaltyCampaign.findFirst({
                where: { id: campaignId, tenantId },
                include: { rewardCoupon: true },
            });
            if (!currentRow) {
                throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
            }
            const current = this.mapCampaign(currentRow);
            assertLoyaltyCampaignDraft(
                current.status === LoyaltyCampaignStatus.DRAFT,
                "Only DRAFT loyalty campaigns can be updated",
            );

            const candidate = {
                name: data.name ?? current.name,
                source: data.source ?? current.source,
                metric: data.metric ?? current.metric,
                targetValue: data.targetValue ?? current.targetValue,
                startsAt: data.startsAt ?? current.startsAt,
                endsAt: data.endsAt ?? current.endsAt,
                claimUntil: data.claimUntil ?? current.claimUntil,
                rewardCouponId: current.rewardCouponId,
                rewardValidDays:
                    data.rewardValidDays ?? current.rewardValidDays,
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
                    ValidationErrorCodes.INVALID_CAMPAIGN_MAX_CLAIMS,
                );
            }

            const templateId = current.rewardCouponId;
            if (!templateId) {
                rejectLoyaltyRewardTemplate(
                    "Campaign reward template is missing",
                );
            }
            const existingTemplate = await tx.coupon.findFirst({
                where: {
                    id: templateId,
                    tenantId,
                    ownerId: null,
                    isReward: false,
                    isLoyaltyTemplate: true,
                },
            });
            if (!existingTemplate) {
                rejectLoyaltyRewardTemplate(
                    "The campaign reward template is missing",
                );
            }
            if (reward) {
                if (templateId) {
                    await this.updateTemplate(tx, tenantId, templateId, {
                        type: reward.type,
                        value: reward.value,
                        description: reward.description?.trim() || null,
                        minPurchaseAmount: reward.minPurchaseAmount ?? null,
                        maxDiscountAmount: reward.maxDiscountAmount ?? null,
                        active: true,
                        expiresAt: new Date(candidate.claimUntil),
                        applicableProducts: [
                            ...(reward.applicableProducts ?? []),
                        ],
                        applicableCategories: [
                            ...(reward.applicableCategories ?? []),
                        ],
                        applicableServices: [
                            ...(reward.applicableServices ?? []),
                        ],
                        ownerId: null,
                        isReward: false,
                        isLoyaltyTemplate: true,
                        sourceCouponId: null,
                        usageLimit: null,
                    });
                }
            } else {
                await this.updateTemplate(tx, tenantId, templateId, {
                    expiresAt: new Date(candidate.claimUntil),
                });
            }

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
            if (data.claimUntil !== undefined) {
                updateData.claimUntil = data.claimUntil;
            }
            if (data.rewardValidDays !== undefined) {
                updateData.rewardValidDays = data.rewardValidDays;
            }
            if (data.maxClaims !== undefined) updateData.maxClaims = data.maxClaims;

            const result = await tx.loyaltyCampaign.updateMany({
                where: {
                    id: campaignId,
                    tenantId,
                    status: LoyaltyCampaignStatus.DRAFT,
                },
                data: updateData,
            });
            assertLoyaltyCampaignDraft(
                result.count > 0,
                "The loyalty campaign is no longer DRAFT",
            );
            const updated = await tx.loyaltyCampaign.findFirst({
                where: { id: campaignId, tenantId },
                include: { rewardCoupon: true },
            });
            if (!updated) {
                throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
            }
            return this.mapCampaign(updated);
        });
    }

    async deleteCampaign(tenantId: string, campaignId: string): Promise<void> {
        this.validateIdentity(tenantId, campaignId);
        await this.db.$transaction(async (tx) => {
            const currentRow = await tx.loyaltyCampaign.findFirst({
                where: { id: campaignId, tenantId },
                include: { rewardCoupon: true },
            });
            if (!currentRow) {
                throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
            }
            const current = this.mapCampaign(currentRow);
            assertLoyaltyCampaignDraft(
                current.status === LoyaltyCampaignStatus.DRAFT,
                "Only DRAFT loyalty campaigns can be deleted",
            );
            const result = await tx.loyaltyCampaign.deleteMany({
                where: {
                    id: campaignId,
                    tenantId,
                    status: LoyaltyCampaignStatus.DRAFT,
                },
            });
            assertLoyaltyCampaignDraft(
                result.count > 0,
                "The loyalty campaign is no longer DRAFT",
            );
            if (current.rewardCouponId && current.claimedCount === 0) {
                await tx.coupon.deleteMany({
                    where: {
                        id: current.rewardCouponId,
                        tenantId,
                        ownerId: null,
                        isReward: false,
                        isLoyaltyTemplate: true,
                    },
                });
            }
        });
    }

    async listCampaigns(tenantId: string): Promise<LoyaltyCampaign[]> {
        this.validateIdentity(tenantId);
        const rows = await this.db.loyaltyCampaign.findMany({
            where: { tenantId },
            include: { rewardCoupon: true },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((row) => this.mapCampaign(row));
    }

    async hasLiveLoyaltyObligations(tenantId: string): Promise<boolean> {
        this.validateIdentity(tenantId);
        const now = new Date();
        const [campaign, rewardCoupon] = await Promise.all([
            this.db.loyaltyCampaign.findFirst({
                where: {
                    tenantId,
                    status: {
                        in: [
                            LoyaltyCampaignStatus.ACTIVE,
                            LoyaltyCampaignStatus.ENDED,
                        ],
                    },
                    OR: [
                        {
                            status: LoyaltyCampaignStatus.ACTIVE,
                        },
                        {
                            status: LoyaltyCampaignStatus.ENDED,
                            claimUntil: { gt: now },
                        },
                    ],
                },
            }),
            this.db.coupon.findFirst({
                where: {
                    tenantId,
                    ownerId: { not: null },
                    isReward: true,
                    isLoyaltyTemplate: false,
                    active: true,
                    usageCount: 0,
                    expiresAt: { gt: now },
                },
            }),
        ]);
        return Boolean(campaign || rewardCoupon);
    }

    async getCampaign(
        tenantId: string,
        campaignId: string,
    ): Promise<LoyaltyCampaign | null> {
        this.validateIdentity(tenantId, campaignId);
        const row = await this.db.loyaltyCampaign.findFirst({
            where: { id: campaignId, tenantId },
            include: { rewardCoupon: true },
        });
        return row ? this.mapCampaign(row) : null;
    }

    private async calculateCampaignProgressValue(
        ledger: LoyaltyLedgerDelegate,
        tenantId: string,
        campaign: LoyaltyCampaign,
        userId: string,
    ): Promise<string> {
        const where = {
            tenantId,
            campaignId: campaign.id,
            userId,
            sourceType: {
                in: getLoyaltyCampaignSourceTypes(campaign.source),
            },
        };

        if (campaign.metric === LoyaltyCampaignMetric.COUNT) {
            const accrualCount = await ledger.count({
                where: {
                    ...where,
                    entryType: LoyaltyLedgerEntryType.ACCRUAL,
                },
            });
            const reversalCount = await ledger.count({
                where: {
                    ...where,
                    entryType: LoyaltyLedgerEntryType.REVERSAL,
                },
            });
            return this.countProgressValue(campaign, accrualCount, reversalCount);
        }

        const aggregate = await ledger.aggregate({
            where: {
                ...where,
                entryType: {
                    in: [
                        LoyaltyLedgerEntryType.ACCRUAL,
                        LoyaltyLedgerEntryType.REVERSAL,
                    ],
                },
            },
            _sum: { value: true },
        });
        return this.spendProgressValue(campaign, aggregate._sum.value);
    }

    /**
     * Normalisation for a COUNT campaign's ledger activity. Shared with the
     * batched path so a customer's progress cannot differ between reading one
     * campaign and reading many.
     */
    private countProgressValue(
        campaign: LoyaltyCampaign,
        accrualCount: number,
        reversalCount: number,
    ): string {
        return getLoyaltyCampaignProgressValue(
            campaign.metric,
            toFixedDecimalString(
                new Prisma.Decimal(
                    Math.max(accrualCount - reversalCount, 0),
                ),
            ),
        );
    }

    /**
     * Normalisation for a SPEND campaign's ledger activity, shared with the
     * batched path for the same reason.
     */
    private spendProgressValue(
        campaign: LoyaltyCampaign,
        total: Prisma.Decimal | null,
    ): string {
        return getLoyaltyCampaignProgressValue(
            campaign.metric,
            toFixedDecimalString(total ?? new Prisma.Decimal(0)),
        );
    }

    /**
     * Builds the progress record for one campaign. Shared with the batched path
     * so `reachedTarget` is decided identically in both.
     */
    private toCampaignProgress(
        campaign: LoyaltyCampaign,
        userId: string,
        progressValue: string,
    ): LoyaltyCampaignProgress {
        return {
            campaignId: campaign.id,
            userId,
            metric: campaign.metric,
            progressValue,
            targetValue: campaign.targetValue,
            reachedTarget: new Prisma.Decimal(progressValue).gte(
                new Prisma.Decimal(campaign.targetValue),
            ),
        };
    }

    async getCampaignProgress(
        tenantId: string,
        campaignId: string,
        userId: string,
        knownCampaign?: LoyaltyCampaign,
    ): Promise<LoyaltyCampaignProgress> {
        this.validateIdentity(tenantId, campaignId, userId);
        // A caller that already holds the campaign passes it; the metric and the
        // target it needs live on that row, so re-reading it is a wasted query.
        const campaign =
            knownCampaign ?? (await this.getCampaign(tenantId, campaignId));
        if (!campaign) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        const progressValue = await this.calculateCampaignProgressValue(
            this.db.loyaltyLedgerEntry,
            tenantId,
            campaign,
            userId,
        );
        return this.toCampaignProgress(campaign, userId, progressValue);
    }

    async getCampaignsProgressForCustomer(
        tenantId: string,
        userId: string,
        campaigns: LoyaltyCampaign[],
    ): Promise<LoyaltyCampaignProgress[]> {
        this.validateIdentity(tenantId, userId);
        if (campaigns.length === 0) {
            return [];
        }
        // One read per (metric, source) pair rather than per campaign. The
        // source cannot be collapsed across campaigns: a groupBy that widened
        // sourceType to the union of the batch would count an ORDER entry
        // towards a BOOKING campaign, so campaigns are grouped by the exact
        // source set the single-campaign path would have used.
        const groups = new Map<string, LoyaltyCampaign[]>();
        for (const campaign of campaigns) {
            const key = `${campaign.metric}:${campaign.source}`;
            const group = groups.get(key);
            if (group) {
                group.push(campaign);
            } else {
                groups.set(key, [campaign]);
            }
        }

        const progressByCampaign = new Map<string, LoyaltyCampaignProgress>();
        for (const group of groups.values()) {
            const sample = group[0];
            const campaignIds = group.map((campaign) => campaign.id);
            // `entryType` is added per call, once the metric decides which entry
            // types count, so the shared base is the where-clause without it.
            const where: Omit<LoyaltyLedgerWhere, "entryType"> = {
                tenantId,
                userId,
                campaignId: { in: campaignIds },
                sourceType: {
                    in: getLoyaltyCampaignSourceTypes(sample.source),
                },
            };

            if (sample.metric === LoyaltyCampaignMetric.COUNT) {
                const rows = await this.db.loyaltyLedgerEntry.groupBy({
                    by: ["campaignId", "entryType"],
                    where: {
                        ...where,
                        entryType: {
                            in: [
                                LoyaltyLedgerEntryType.ACCRUAL,
                                LoyaltyLedgerEntryType.REVERSAL,
                            ],
                        },
                    },
                    _count: { _all: true },
                });
                const counts = new Map<string, { accrual: number; reversal: number }>();
                for (const row of rows) {
                    const current = counts.get(row.campaignId) ?? {
                        accrual: 0,
                        reversal: 0,
                    };
                    if (row.entryType === LoyaltyLedgerEntryType.ACCRUAL) {
                        current.accrual = row._count._all;
                    } else {
                        current.reversal = row._count._all;
                    }
                    counts.set(row.campaignId, current);
                }
                for (const campaign of group) {
                    const current = counts.get(campaign.id);
                    const progressValue = this.countProgressValue(
                        campaign,
                        current?.accrual ?? 0,
                        current?.reversal ?? 0,
                    );
                    progressByCampaign.set(
                        campaign.id,
                        this.toCampaignProgress(campaign, userId, progressValue),
                    );
                }
                continue;
            }

            const rows = await this.db.loyaltyLedgerEntry.groupBy({
                by: ["campaignId"],
                where: {
                    ...where,
                    entryType: {
                        in: [
                            LoyaltyLedgerEntryType.ACCRUAL,
                            LoyaltyLedgerEntryType.REVERSAL,
                        ],
                    },
                },
                _sum: { value: true },
            });
            const sums = new Map<string, Prisma.Decimal | null>();
            for (const row of rows) {
                sums.set(row.campaignId, row._sum.value);
            }
            for (const campaign of group) {
                const progressValue = this.spendProgressValue(
                    campaign,
                    sums.get(campaign.id) ?? null,
                );
                progressByCampaign.set(
                    campaign.id,
                    this.toCampaignProgress(campaign, userId, progressValue),
                );
            }
        }

        return campaigns.map(
            (campaign) =>
                progressByCampaign.get(campaign.id) ??
                this.toCampaignProgress(campaign, userId, "0.00"),
        );
    }

    async findCampaignRewardClaimsForCustomer(
        tenantId: string,
        userId: string,
        campaignIds: string[],
    ): Promise<LoyaltyCampaignRewardClaim[]> {
        this.validateIdentity(tenantId, userId);
        if (campaignIds.length === 0) {
            return [];
        }
        const rows = await this.db.loyaltyRewardClaim.findMany({
            where: { tenantId, userId, campaignId: { in: campaignIds } },
            include: { coupon: true },
        });
        return rows.map((row) => this.mapCampaignClaim(row));
    }

    /**
     * How many reward claims a tenant holds, in one query.
     *
     * This counts claim rows rather than summing each campaign's claimedCount
     * column, so a tenant whose claims were removed by a cascading user delete
     * reports the number that is actually there. Summing the column would
     * report the stale one.
     */
    async countCampaignRewardClaims(tenantId: string): Promise<number> {
        this.validateIdentity(tenantId);
        return this.db.loyaltyRewardClaim.count({ where: { tenantId } });
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

    async findCampaignRewardClaim(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<LoyaltyCampaignRewardClaim | null> {
        this.validateIdentity(tenantId, campaignId, userId);
        const row = await this.db.loyaltyRewardClaim.findFirst({
            where: { tenantId, campaignId, userId },
            include: { coupon: true },
        });
        return row ? this.mapCampaignClaim(row) : null;
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
                LoyaltyErrorCodes.INVALID_CAMPAIGN_TRANSITION,
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
                LoyaltyErrorCodes.CAMPAIGN_ARCHIVE_TOO_EARLY,
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
                rewardValidDays: current.rewardValidDays,
                maxClaims: current.maxClaims ?? null,
            });
            if (
                current.maxClaims !== null &&
                current.maxClaims < current.claimedCount
            ) {
                throw new ValidationError(
                    "Campaign maxClaims cannot be lower than claimedCount",
                    ValidationErrorCodes.INVALID_CAMPAIGN_MAX_CLAIMS,
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
                    include: { rewardCoupon: true },
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
                        LoyaltyErrorCodes.CAMPAIGN_NOT_CLAIMABLE,
                    );
                }
                assertLoyaltyCampaignRewardConfigured(
                    campaign.rewardCouponId,
                    campaign.rewardValidDays,
                    "The campaign reward is not configured",
                );

                const progressValue =
                    await this.calculateCampaignProgressValue(
                        tx.loyaltyLedgerEntry,
                        tenantId,
                        campaign,
                        userId,
                    );
                if (!new Prisma.Decimal(progressValue).gte(new Prisma.Decimal(campaign.targetValue))) {
                    throw new BusinessRuleViolationError(
                        "The loyalty campaign target has not been reached",
                        LoyaltyErrorCodes.TARGET_NOT_REACHED,
                    );
                }

                const template = await tx.coupon.findFirst({
                    where: {
                        // The guard above already rejected an unconfigured reward.
                        id: campaign.rewardCouponId!,
                        tenantId,
                        ownerId: null,
                        isReward: false,
                        isLoyaltyTemplate: true,
                        active: true,
                        expiresAt: { gte: campaign.claimUntil },
                    },
                });
                if (!template) {
                    rejectLoyaltyRewardTemplate(
                        "The campaign reward template is inactive, expired, or not shared",
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
                        LoyaltyErrorCodes.CAMPAIGN_CLAIM_LIMIT_REACHED,
                    );
                }

                const expiresAt = new Date(claimAt);
                expiresAt.setUTCDate(
                    expiresAt.getUTCDate() + campaign.rewardValidDays!,
                );
                if (!Number.isFinite(expiresAt.getTime())) {
                    throw new ValidationError(
                        "Campaign reward validity produces an invalid expiry date",
                        ValidationErrorCodes.INVALID_LOYALTY_REWARD_VALIDITY,
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

}
