import { randomUUID } from "node:crypto";
import { Coupon as PrismaCoupon, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    ICouponRepository,
    CreateCouponData,
    UpdateCouponData,
} from "@/core/repositories/coupon.repository.interface";
import { Coupon, CouponType } from "@/core/entities/coupon.entity";
import {
    BusinessRuleViolationError,
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

type CouponWhereInput = Prisma.CouponWhereInput & {
    ownerId?: Prisma.StringNullableFilter<"Coupon"> | string | null;
    isReward?: Prisma.BoolFilter<"Coupon"> | boolean;
};

type CouponUncheckedCreateInput = Prisma.CouponUncheckedCreateInput & {
    ownerId?: string;
    isReward?: boolean;
    sourceCouponId?: string;
};

function toCouponType(value: string): CouponType {
    if (value === CouponType.PERCENT || value === CouponType.FIXED) {
        return value;
    }
    throw new Error(`Unsupported coupon type: ${value}`);
}

function sharedCouponWhere(
    conditions: Prisma.CouponWhereInput = {},
): CouponWhereInput {
    return { ...conditions, ownerId: null };
}

function couponOwnerFilters(
    userId?: string,
): Array<Prisma.CouponWhereInput & { ownerId: string | null }> {
    return userId
        ? [{ ownerId: null }, { ownerId: userId }]
        : [{ ownerId: null }];
}

export class PrismaCouponRepository implements ICouponRepository {
    private mapToEntity(data: PrismaCoupon): Coupon {
        return {
            id: data.id,
            code: data.code,
            type: toCouponType(data.type),
            value: data.value,
            description: data.description ?? undefined,
            ownerId: data.ownerId ?? undefined,
            isReward: data.isReward ?? false,
            isLoyaltyTemplate: data.isLoyaltyTemplate ?? false,
            sourceCouponId: data.sourceCouponId ?? undefined,
            minPurchaseAmount: data.minPurchaseAmount ?? undefined,
            maxDiscountAmount: data.maxDiscountAmount ?? undefined,
            usageLimit: data.usageLimit ?? undefined,
            usageCount: data.usageCount,
            active: data.active,
            expiresAt: data.expiresAt,
            applicableProducts: data.applicableProducts,
            applicableCategories: data.applicableCategories,
            applicableServices: data.applicableServices,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }

    async findAll(tenantId: string | undefined): Promise<Coupon[]> {
        const coupons = await prisma.coupon.findMany({
            where: sharedCouponWhere(tenantId ? { tenantId } : {}),
            orderBy: { createdAt: "desc" },
        });
        return coupons.map(this.mapToEntity);
    }

    async findById(
        tenantId: string,
        id: string,
        userId?: string,
    ): Promise<Coupon | null> {
        const where: CouponWhereInput = {
            id,
            tenantId,
            OR: couponOwnerFilters(userId),
        };
        const coupon = await prisma.coupon.findFirst({ where });
        return coupon ? this.mapToEntity(coupon) : null;
    }

    async findByCode(
        tenantId: string,
        code: string,
        userId?: string,
    ): Promise<Coupon | null> {
        const where: CouponWhereInput = {
            tenantId,
            code: code.toUpperCase(),
            OR: couponOwnerFilters(userId),
        };
        const coupon = await prisma.coupon.findFirst({ where });
        return coupon ? this.mapToEntity(coupon) : null;
    }

    async findActive(tenantId: string | undefined): Promise<Coupon[]> {
        const now = new Date();
        const coupons = await prisma.coupon.findMany({
            where: sharedCouponWhere({
                ...(tenantId && { tenantId }),
                active: true,
                expiresAt: { gte: now },
            }),
            orderBy: { createdAt: "desc" },
        });
        return coupons.map(this.mapToEntity);
    }

    async findAllPaginated(
        tenantId: string,
        options: {
            search?: string;
            type?: string;
            status?: "active" | "expired" | "used" | "unused" | "all";
            page: number;
            limit: number;
        },
    ): Promise<{
        coupons: Coupon[];
        total: number;
    }> {
        const { search, type, status, page, limit } = options;
        const now = new Date();

        const where = sharedCouponWhere(tenantId ? { tenantId } : {});

        if (search) {
            where.code = {
                contains: search.toUpperCase(),
                mode: "insensitive",
            };
        }

        if (type && type !== "all") {
            where.type = toCouponType(type);
        }

        if (status && status !== "all") {
            switch (status) {
                case "active":
                    where.active = true;
                    where.expiresAt = { gte: now };
                    break;
                case "expired":
                    where.expiresAt = { lt: now };
                    break;
                case "used":
                    where.usageCount = { gt: 0 };
                    break;
                case "unused":
                    where.usageCount = 0;
                    break;
            }
        }

        const [coupons, total] = await Promise.all([
            prisma.coupon.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.coupon.count({ where }),
        ]);

        return {
            coupons: coupons.map(this.mapToEntity),
            total,
        };
    }

    async create(tenantId: string, data: CreateCouponData): Promise<Coupon> {
        try {
            const coupon = await prisma.coupon.create({
                data: {
                    tenantId,
                    code: data.code.toUpperCase(),
                    type: data.type,
                    value: data.value,
                    description: data.description,
                    minPurchaseAmount: data.minPurchaseAmount,
                    maxDiscountAmount: data.maxDiscountAmount,
                    usageLimit: data.usageLimit,
                    active: data.active ?? true,
                    expiresAt: new Date(data.expiresAt),
                    applicableProducts: data.applicableProducts || [],
                    applicableCategories: data.applicableCategories || [],
                    applicableServices: data.applicableServices || [],
                },
            });
            return this.mapToEntity(coupon);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "code";
                throw new DuplicateEntityError("Coupon", target, data.code);
            }
            throw error;
        }
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateCouponData,
    ): Promise<Coupon> {
        const updateData: Prisma.CouponUpdateInput = {};

        if (data.code !== undefined) updateData.code = data.code.toUpperCase();
        if (data.type !== undefined) updateData.type = data.type;
        if (data.value !== undefined) updateData.value = data.value;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.minPurchaseAmount !== undefined)
            updateData.minPurchaseAmount = data.minPurchaseAmount;
        if (data.maxDiscountAmount !== undefined)
            updateData.maxDiscountAmount = data.maxDiscountAmount;
        if (data.usageLimit !== undefined)
            updateData.usageLimit = data.usageLimit;
        if (data.active !== undefined) updateData.active = data.active;
        if (data.expiresAt !== undefined)
            updateData.expiresAt = new Date(data.expiresAt);
        if (data.applicableProducts !== undefined)
            updateData.applicableProducts = data.applicableProducts;
        if (data.applicableCategories !== undefined)
            updateData.applicableCategories = data.applicableCategories;

        try {
            const coupon = await prisma.coupon.update({
                where: { id, tenantId },
                data: updateData,
            });
            return this.mapToEntity(coupon);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Coupon", id);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "code";
                throw new DuplicateEntityError(
                    "Coupon",
                    target,
                    data.code ?? "",
                );
            }
            throw error;
        }
    }

    async delete(tenantId: string, id: string): Promise<void> {
        try {
            await prisma.coupon.delete({
                where: { id, tenantId },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Coupon", id);
            }
            throw error;
        }
    }

    async incrementUsage(
        tenantId: string,
        id: string,
        userId?: string,
    ): Promise<void> {
        const where: CouponWhereInput = {
            id,
            tenantId,
            OR: [
                { ownerId: null },
                ...(userId
                    ? [
                          {
                              ownerId: userId,
                              isReward: true,
                              usageCount: { lt: 1 },
                          },
                      ]
                    : []),
            ],
        };
        const result = await prisma.coupon.updateMany({
            where,
            data: { usageCount: { increment: 1 } },
        });
        if (result.count === 0) {
            throw new BusinessRuleViolationError(
                "The coupon is not available for this user",
                "COUPON_UNAVAILABLE",
            );
        }
    }

    async cloneRewardCoupon(
        tenantId: string,
        templateId: string,
        userId: string,
        code?: string,
    ): Promise<Coupon> {
        try {
            const coupon = await prisma.$transaction(async (tx) => {
                const where: CouponWhereInput = {
                    id: templateId,
                    tenantId,
                    ownerId: null,
                    isReward: false,
                    active: true,
                    expiresAt: { gte: new Date() },
                };
                const template = await tx.coupon.findFirst({ where });
                if (!template) {
                    throw new EntityNotFoundError("Coupon", templateId);
                }
                const expiresAt = new Date(template.expiresAt).getTime();
                if (
                    !template.active ||
                    !Number.isFinite(expiresAt) ||
                    expiresAt <= Date.now()
                ) {
                    throw new BusinessRuleViolationError(
                        "The reward coupon template is inactive or expired",
                        "INVALID_LOYALTY_REWARD_TEMPLATE",
                    );
                }

                const data: CouponUncheckedCreateInput = {
                    tenantId,
                    code:
                        code?.trim().toUpperCase() ||
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
                    sourceCouponId: templateId,
                };
                return tx.coupon.create({ data });
            });
            return this.mapToEntity(coupon);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new DuplicateEntityError(
                    "Coupon",
                    "code",
                    code ?? "",
                );
            }
            throw error;
        }
    }

    async getStats(tenantId: string): Promise<{
        totalCoupons: number;
        activeCoupons: number;
        usedCoupons: number;
        unusedCoupons: number;
        expiredCoupons: number;
    }> {
        const now = new Date();
        const [
            totalCoupons,
            activeCoupons,
            usedCoupons,
            unusedCoupons,
            expiredCoupons,
        ] = await Promise.all([
            prisma.coupon.count({ where: sharedCouponWhere({ tenantId }) }),
            prisma.coupon.count({
                where: sharedCouponWhere({
                    tenantId,
                    active: true,
                    expiresAt: { gte: now },
                }),
            }),
            prisma.coupon.count({
                where: sharedCouponWhere({
                    tenantId,
                    usageCount: { gt: 0 },
                }),
            }),
            prisma.coupon.count({
                where: sharedCouponWhere({ tenantId, usageCount: 0 }),
            }),
            prisma.coupon.count({
                where: sharedCouponWhere({
                    tenantId,
                    expiresAt: { lt: now },
                }),
            }),
        ]);

        return {
            totalCoupons,
            activeCoupons,
            usedCoupons,
            unusedCoupons,
            expiredCoupons,
        };
    }
}
