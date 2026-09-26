import {
    Order as PrismaOrder,
    OrderItem as PrismaOrderItem,
    OrderStatus as PrismaOrderStatus,
    Prisma,
} from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    IOrderRepository,
    OrderCreateData,
    OrderStatusUpdate,
    OrderUpdateData,
} from "@/core/repositories/order.repository.interface";
import { Order, OrderStatus, OrderItem } from "@/core/entities/order.entity";
import { Product } from "@/core/entities/product.entity";
import {
    assertCouponRedeemable,
    assertCouponsFeatureEnabled,
    isApplicableToCategory,
    isApplicableToProduct,
    toRedeemableCoupon,
} from "@/core/domain/coupon/coupon.policy";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyLedgerEntryType,
    LoyaltySourceType,
} from "@/core/entities/loyalty.entity";
import {
    getLoyaltyCampaignContributionValue,
    getLoyaltyCampaignSource,
} from "@/core/domain/loyalty/loyalty.policy";
import { rejectInsufficientStock } from "@/core/domain/order/order.policy";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

type OrderWithIncludes = Prisma.OrderGetPayload<{
    include: {
        items: { include: { product: true } };
        user: { select: { name: true; email: true } };
    };
}>;

type OrderItemWithProduct = OrderWithIncludes["items"][number];

/**
 * OrderStatus is a string union in the domain, so membership is checked against
 * an explicit list typed as the union: a typo fails to compile, and the list
 * cannot admit a value the domain does not model.
 */
const ORDER_STATUSES: readonly OrderStatus[] = [
    "PENDIENTE",
    "PAGADO",
    "ENVIADO",
    "ENTREGADO",
];

function isOrderStatus(value: string): value is OrderStatus {
    return (ORDER_STATUSES as string[]).includes(value);
}

function toOrderStatus(value: string): OrderStatus {
    if (!isOrderStatus(value)) {
        throw new Error(`Unsupported order status: ${value}`);
    }
    return value;
}

export class PrismaOrderRepository implements IOrderRepository {
    private mapOrderItem(item: OrderItemWithProduct): OrderItem {
        return {
            id: item.id,
            orderId: item.orderId,
            productId: item.productId,
            amount: item.amount,
            price: Number(item.price),
            product: item.product
                ? ({
                      id: item.product.id,
                      name: item.product.name,
                      description: item.product.description,
                      image: item.product.image,
                      price: Number(item.product.price),
                      ownerId: (item.product as { ownerId: string }).ownerId,
                  } as Product)
                : undefined,
        };
    }

    private mapToEntity(prismaOrder: OrderWithIncludes): Order {
        return {
            id: prismaOrder.id,
            userId: prismaOrder.userId,
            status: toOrderStatus(prismaOrder.status),
            trackingNumber: prismaOrder.trackingNumber,
            subtotal: Number(prismaOrder.subtotal),
            total: Number(prismaOrder.total),
            discountAmount: Number(prismaOrder.discountAmount),
            couponId: prismaOrder.couponId,
            items: prismaOrder.items.map((item) => this.mapOrderItem(item)),
            createdAt: prismaOrder.createdAt,
            updatedAt: prismaOrder.updatedAt,
            user: prismaOrder.user,
        };
    }

    async createWithInventoryAdjustment(
        tenantId: string,
        data: OrderCreateData,
        adjustments: Array<{ productId: string; amount: number }>,
    ): Promise<Order> {
        return prisma.$transaction(async (tx) => {
            const subtotal = data.items.reduce(
                (sum, item) =>
                    sum.plus(
                        new Prisma.Decimal(item.price).mul(item.amount),
                    ),
                new Prisma.Decimal(0),
            );
            let discountAmount = new Prisma.Decimal(0);

            const coupon = data.couponId
                ? await tx.coupon.findFirst({
                      where: { id: data.couponId, tenantId },
                  })
                : null;

            if (data.couponId && !coupon) {
                throw new EntityNotFoundError("Coupon", data.couponId);
            }

            if (coupon) {
                assertCouponRedeemable(
                    toRedeemableCoupon(coupon),
                    data.userId,
                );

                const productIds = [
                    ...new Set(data.items.map((item) => item.productId)),
                ];
                const products = await tx.product.findMany({
                    where: {
                        id: { in: productIds },
                        tenantId,
                    },
                    select: {
                        id: true,
                        categories: { select: { id: true } },
                    },
                });
                const foundProductIds = new Set(
                    products.map((product) => product.id),
                );
                const missingProductId = productIds.find(
                    (id) => !foundProductIds.has(id),
                );
                if (missingProductId) {
                    throw new EntityNotFoundError(
                        "Product",
                        missingProductId,
                    );
                }

                if (
                    productIds.length > 0 &&
                    !productIds.some((id) =>
                        isApplicableToProduct(coupon, id),
                    )
                ) {
                    throw new BusinessRuleViolationError(
                        "Coupon not applicable to products in cart",
                    );
                }

                const categoryIds = [
                    ...new Set(
                        products.flatMap((product) =>
                            product.categories.map(({ id }) => id),
                        ),
                    ),
                ];
                if (
                    coupon.applicableCategories.length > 0 &&
                    !categoryIds.some((id) =>
                        isApplicableToCategory(coupon, id),
                    )
                ) {
                    throw new BusinessRuleViolationError(
                        "Coupon not applicable to product categories in cart",
                    );
                }
                if (
                    coupon.applicableServices.length > 0 &&
                    coupon.applicableProducts.length === 0 &&
                    coupon.applicableCategories.length === 0
                ) {
                    throw new BusinessRuleViolationError(
                        "Coupon is only applicable to services",
                    );
                }

                if (
                    coupon.minPurchaseAmount !== null &&
                    subtotal.lessThan(coupon.minPurchaseAmount)
                ) {
                    throw new BusinessRuleViolationError(
                        `Minimum purchase amount of $${coupon.minPurchaseAmount} required`,
                    );
                }

                discountAmount =
                    coupon.type === "PERCENT"
                        ? subtotal.mul(coupon.value).div(100)
                        : new Prisma.Decimal(coupon.value);
                if (
                    coupon.maxDiscountAmount !== null &&
                    discountAmount.greaterThan(coupon.maxDiscountAmount)
                ) {
                    discountAmount = new Prisma.Decimal(
                        coupon.maxDiscountAmount,
                    );
                }
                if (discountAmount.greaterThan(subtotal)) {
                    discountAmount = subtotal;
                }
            }

            if (coupon) {
                const couponsEnabled = await tx.tenantFeature.findFirst({
                    where: {
                        tenantId,
                        enabled: true,
                        feature: { key: "COUPONS" },
                    },
                    select: { id: true },
                });
                assertCouponsFeatureEnabled(couponsEnabled !== null);
            }

            for (const adjustment of adjustments) {
                const result = await tx.product.updateMany({
                    where: {
                        id: adjustment.productId,
                        tenantId,
                        stock: { gte: adjustment.amount },
                    },
                    data: { stock: { decrement: adjustment.amount } },
                });
                if (result.count === 0) {
                    rejectInsufficientStock(adjustment.productId);
                }
            }

            if (coupon) {
                const usage = await tx.coupon.updateMany({
                    where: {
                        id: coupon.id,
                        tenantId,
                        usageCount: coupon.usageCount,
                        usageLimit: coupon.usageLimit,
                        updatedAt: coupon.updatedAt,
                        active: true,
                        expiresAt: { gt: new Date() },
                        isLoyaltyTemplate: false,
                        ...(coupon.isReward
                            ? { ownerId: data.userId, isReward: true }
                            : {
                                  isReward: false,
                                  OR: [
                                      { ownerId: null },
                                      { ownerId: data.userId },
                                  ],
                              }),
                    },
                    data: { usageCount: { increment: 1 } },
                });
                if (usage.count === 0) {
                    throw new BusinessRuleViolationError(
                        "The coupon is not available for this user",
                        "COUPON_UNAVAILABLE",
                    );
                }
            }

            const total = subtotal.minus(discountAmount);
            const order = await tx.order.create({
                data: {
                    userId: data.userId,
                    tenantId,
                    status: "PENDIENTE" as PrismaOrderStatus,
                    couponId: coupon?.id,
                    subtotal: subtotal.toNumber(),
                    total: total.toNumber(),
                    discountAmount: discountAmount.toNumber(),
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            amount: item.amount,
                            price: item.price,
                        })),
                    },
                },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return this.mapToEntity(order);
        });
    }

    async findById(tenantId: string, id: string): Promise<Order | null> {
        const order = await prisma.order.findFirst({
            where: { id, tenantId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return order ? this.mapToEntity(order) : null;
    }

    async findByUserId(
        tenantId: string,
        userId: string,
        status?: OrderStatus,
    ): Promise<Order[]> {
        const where: Prisma.OrderWhereInput = { userId, tenantId };
        if (status) {
            where.status = status as PrismaOrderStatus;
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return orders.map((o) => this.mapToEntity(o));
    }

    async findAll(tenantId: string): Promise<Order[]> {
        const orders = await prisma.order.findMany({
            where: { tenantId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return orders.map((o) => this.mapToEntity(o));
    }

    async findAllPaginated(
        tenantId: string,
        options: {
            search?: string;
            status?: string;
            page: number;
            limit: number;
            startDate?: Date;
            endDate?: Date;
        },
    ): Promise<{
        orders: Order[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { search, status, page, limit, startDate, endDate } = options;

        const where: Prisma.OrderWhereInput = { tenantId };

        if (search) {
            where.OR = [
                { id: { contains: search, mode: "insensitive" } },
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { email: { contains: search, mode: "insensitive" } } },
            ];
        }

        if (status && status !== "all") {
            where.status = status as PrismaOrderStatus;
        }

        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.order.count({ where }),
        ]);

        return {
            orders: orders.map((o) => this.mapToEntity(o)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async updateStatus(
        tenantId: string,
        id: string,
        data: OrderStatusUpdate,
    ): Promise<Order | null> {
        return prisma.$transaction(async (tx) => {
            const eventAt = new Date();
            const result = await tx.order.updateMany({
                where: {
                    id,
                    tenantId,
                    status: data.expectedStatus as PrismaOrderStatus,
                },
                data: {
                    status: data.status as PrismaOrderStatus,
                    ...(data.trackingNumber !== undefined && {
                        trackingNumber: data.trackingNumber,
                    }),
                },
            });
            if (result.count === 0) {
                return null;
            }

            const order = await tx.order.findFirst({
                where: {
                    id,
                    tenantId,
                    status: data.status as PrismaOrderStatus,
                },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            if (
                order &&
                data.status === "ENTREGADO" &&
                data.qualifyLoyalty
            ) {
                const loyaltyEnabled =
                    (await tx.tenantFeature.findFirst({
                        where: {
                            tenantId,
                            enabled: true,
                            feature: { key: "LOYALTY" },
                        },
                        select: { id: true },
                    })) !== null;
                const campaign = loyaltyEnabled
                    ? await tx.loyaltyCampaign.findFirst({
                          where: {
                              tenantId,
                              status: "ACTIVE",
                              source: {
                                  in: [
                                      getLoyaltyCampaignSource(
                                          LoyaltySourceType.ORDER,
                                      ),
                                      LoyaltyCampaignSource.ALL,
                                  ],
                              },
                              startsAt: { lte: eventAt },
                              endsAt: { gt: eventAt },
                          },
                          orderBy: { startsAt: "desc" },
                          select: { id: true, metric: true },
                      })
                    : null;

                if (campaign) {
                    const value = getLoyaltyCampaignContributionValue({
                        metric: campaign.metric as LoyaltyCampaignMetric,
                        netTotal: new Prisma.Decimal(order.total).toFixed(
                            2,
                        ),
                    });
                    await tx.loyaltyLedgerEntry.upsert({
                        where: {
                            campaignId_sourceType_sourceId_entryType: {
                                campaignId: campaign.id,
                                sourceType: LoyaltySourceType.ORDER,
                                sourceId: id,
                                entryType: LoyaltyLedgerEntryType.ACCRUAL,
                            },
                        },
                        create: {
                            tenantId,
                            campaignId: campaign.id,
                            userId: order.userId,
                            sourceType: LoyaltySourceType.ORDER,
                            sourceId: id,
                            value,
                            entryType: LoyaltyLedgerEntryType.ACCRUAL,
                            reason: "order.delivered",
                            createdAt: eventAt,
                        },
                        update: {},
                    });
                }
            }

            return order ? this.mapToEntity(order) : null;
        });
    }

    async update(
        tenantId: string,
        id: string,
        data: OrderUpdateData,
    ): Promise<Order> {
        const updateData: Prisma.OrderUpdateInput = {};
        if (data.trackingNumber !== undefined)
            updateData.trackingNumber = data.trackingNumber;

        try {
            const order = await prisma.order.update({
                where: { id, tenantId },
                data: updateData,
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return this.mapToEntity(order);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Order", id);
            }
            throw error;
        }
    }

    async getStats(
        tenantId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{
        totalOrders: number;
        totalRevenue: number;
        statusCounts: Record<string, number>;
    }> {
        const where: Prisma.OrderWhereInput = { tenantId };
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }

        const [aggregations, allOrders] = await Promise.all([
            prisma.order.aggregate({
                where,
                _count: { id: true },
                _sum: { total: true },
            }),
            prisma.order.findMany({
                where,
                select: { status: true },
            }),
        ]);

        const statusCounts = allOrders.reduce(
            (acc: Record<string, number>, order) => {
                const status = order.status as string;
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            },
            {},
        );

        return {
            totalOrders: aggregations._count.id,
            totalRevenue: Number(aggregations._sum.total || 0),
            statusCounts,
        };
    }
}
