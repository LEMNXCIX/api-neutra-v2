import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    ILoyaltyRepository,
    CreateLoyaltyLedgerEntryData,
    LoyaltyRewardClaimResult,
} from "@/core/repositories/loyalty.repository.interface";
import {
    LoyaltyLedgerEntry,
    LoyaltyRewardClaim,
    LoyaltyRewardClaimStatus,
    LoyaltyTenantStats,
    LOYALTY_REWARD_MILESTONE,
    isValidLoyaltyTargetPoints,
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
    sourceCouponId: string | null;
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
    userId: string;
    milestone: number;
    couponId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    coupon: CouponRecord | null;
};

type LedgerWhere = {
    tenantId: string;
    userId?: string;
};

type LedgerAppointmentWhere = {
    tenantId: string;
    sourceAppointmentId: string;
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
};

type ClaimCreateData = {
    tenantId: string;
    userId: string;
    milestone: number;
    couponId: string;
    status: LoyaltyRewardClaimStatus;
};

type RewardCouponWhere = {
    id: string;
    tenantId: string;
    ownerId: null;
    isReward: false;
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
        where: { tenantId: string; userId?: string };
        _sum: { points: true };
    }): Promise<{ _sum: { points: number | null } }>;
};

type LoyaltyRewardClaimDelegate = {
    findFirst(args: {
        where: ClaimWhere;
        include: { coupon: true };
    }): Promise<ClaimRecord | null>;
    findMany(args: {
        where: { tenantId: string };
        orderBy: { createdAt: "desc" };
        include: { coupon: true };
        take?: number;
    }): Promise<ClaimRecord[]>;
    count(args: { where: { tenantId: string } }): Promise<number>;
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

function toClaimStatus(value: string): LoyaltyRewardClaimStatus {
    if (value === LoyaltyRewardClaimStatus.CLAIMED) {
        return LoyaltyRewardClaimStatus.CLAIMED;
    }
    throw new Error(`Unsupported loyalty claim status: ${value}`);
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

    private toClaimResult(row: ClaimRecord): LoyaltyRewardClaimResult {
        if (!row.coupon) {
            throw new EntityNotFoundError("Coupon", row.couponId);
        }
        return {
            claim: this.mapClaim(row),
            coupon: this.mapCoupon(row.coupon),
        };
    }

    async findLedgerEntries(
        tenantId: string,
        userId?: string,
    ): Promise<LoyaltyLedgerEntry[]> {
        const rows = await this.db.loyaltyLedgerEntry.findMany({
            where: {
                tenantId,
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
            where: { tenantId, sourceAppointmentId },
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
            where: { tenantId, userId },
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
            where: { tenantId, userId },
            include: { coupon: true },
        });
        return row ? this.mapClaim(row) : null;
    }

    async findRecentLedgerEntries(
        tenantId: string,
        limit = 20,
    ): Promise<LoyaltyLedgerEntry[]> {
        const rows = await this.db.loyaltyLedgerEntry.findMany({
            where: { tenantId },
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
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            include: { coupon: true },
            take: Math.max(1, Math.min(100, limit)),
        });
        return rows.map((row) => this.mapClaim(row));
    }

    async getTenantStats(tenantId: string): Promise<LoyaltyTenantStats> {
        const [points, totalClaims, entries] = await Promise.all([
            this.db.loyaltyLedgerEntry.aggregate({
                where: { tenantId },
                _sum: { points: true },
            }),
            this.db.loyaltyRewardClaim.count({ where: { tenantId } }),
            this.db.loyaltyLedgerEntry.findMany({
                where: { tenantId },
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
                    },
                    include: { coupon: true },
                });
                if (existing) {
                    return this.toClaimResult(existing);
                }

                const balance = await tx.loyaltyLedgerEntry.aggregate({
                    where: { tenantId, userId },
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
