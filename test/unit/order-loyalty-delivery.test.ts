import { prisma } from "@/config/db.config";
import { ChangeOrderStatusUseCase } from "@/core/application/order/change-order-status.use-case";
import { UpdateOrderUseCase } from "@/core/application/order/update-order.use-case";
import type { Order, OrderStatus } from "@/core/entities/order.entity";
import type { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { PrismaOrderRepository } from "@/infrastructure/database/prisma/order.prisma-repository";
import { BusinessErrorCodes } from "@/types/error-codes";

function order(status: OrderStatus): Order {
    return {
        id: "order-1",
        userId: "order-owner",
        status,
        items: [],
        subtotal: 19.9,
        total: 19.9,
        discountAmount: 0,
        couponId: null,
        createdAt: new Date("2030-01-01T09:00:00.000Z"),
        updatedAt: new Date("2030-01-01T09:00:00.000Z"),
    };
}

function statusUseCase(currentStatus: OrderStatus = "ENVIADO") {
    const orderRepository = {
        findById: jest.fn().mockResolvedValue(order(currentStatus)),
        updateStatus: jest.fn().mockResolvedValue(order("ENTREGADO")),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn().mockResolvedValue({ LOYALTY: true }),
    };
    const useCase = new ChangeOrderStatusUseCase(
        orderRepository as unknown as IOrderRepository,
        featureRepository as never,
    );

    return { useCase, orderRepository, featureRepository };
}

function useTransactionCallback() {
    return jest.spyOn(prisma, "$transaction") as unknown as jest.Mock;
}

function mockCommittedLoyaltyFeature(enabled = true) {
    return jest
        .spyOn(prisma.tenantFeature, "findFirst")
        .mockResolvedValue(enabled ? ({ id: "feature-1" } as never) : null);
}

function detailUpdateUseCase(currentStatus: OrderStatus = "ENVIADO") {
    const orderRepository = {
        findById: jest.fn().mockResolvedValue(order(currentStatus)),
        updateStatus: jest.fn().mockResolvedValue(order("ENTREGADO")),
        update: jest.fn().mockResolvedValue(order(currentStatus)),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn().mockResolvedValue({ LOYALTY: true }),
    };
    const changeOrderStatusUseCase = new ChangeOrderStatusUseCase(
        orderRepository as never,
        featureRepository as never,
    );
    const useCase = new UpdateOrderUseCase(
        orderRepository as never,
        changeOrderStatusUseCase,
    );
    return { useCase, orderRepository, featureRepository };
}

function deliveredOrderRow() {
    return {
        ...order("ENTREGADO"),
        tenantId: "tenant-1",
        trackingNumber: null,
    };
}

type CampaignRow = {
    id: string;
    tenantId: string;
    status: string;
    source: string;
    metric: string;
    startsAt: Date;
    endsAt: Date;
};

type CampaignSelectionQuery = {
    where: {
        tenantId: string;
        status: string;
        source: { in: string[] };
        startsAt: { lte: Date };
        endsAt: { gt: Date };
    };
    orderBy: { startsAt: "asc" | "desc" };
};

/**
 * Answers the campaign-selection query the adapter actually emitted, the way
 * Postgres would: filter, then order, then take the first row.
 */
function selectCampaign(
    query: CampaignSelectionQuery,
    rows: CampaignRow[],
): CampaignRow | null {
    const { where, orderBy } = query;
    const eligible = rows
        .filter(
            (row) =>
                row.tenantId === where.tenantId &&
                row.status === where.status &&
                where.source.in.includes(row.source) &&
                row.startsAt.getTime() <= where.startsAt.lte.getTime() &&
                row.endsAt.getTime() > where.endsAt.gt.getTime(),
        )
        .sort((a, b) =>
            orderBy.startsAt === "desc"
                ? b.startsAt.getTime() - a.startsAt.getTime()
                : a.startsAt.getTime() - b.startsAt.getTime(),
        );
    return eligible[0] ?? null;
}

function campaignRow(overrides: Partial<CampaignRow> = {}): CampaignRow {
    return {
        id: "campaign-store",
        tenantId: "tenant-1",
        status: "ACTIVE",
        source: "STORE",
        metric: "COUNT",
        startsAt: new Date("2029-12-01T00:00:00.000Z"),
        endsAt: new Date("2030-12-31T00:00:00.000Z"),
        ...overrides,
    };
}

/** The campaigns an ORDER event competes for: two STORE, one BOOKING, one ALL. */
function competingCampaigns() {
    return [
        campaignRow({ id: "campaign-store-older" }),
        campaignRow({
            id: "campaign-store-newer",
            startsAt: new Date("2030-01-01T00:00:00.000Z"),
        }),
        campaignRow({ id: "campaign-booking", source: "BOOKING" }),
        campaignRow({ id: "campaign-all", source: "ALL" }),
    ];
}

function selectCampaignOver(rows: CampaignRow[]) {
    return jest
        .spyOn(prisma.loyaltyCampaign, "findFirst")
        .mockImplementation((async (args: unknown) => {
            const selected = selectCampaign(
                args as CampaignSelectionQuery,
                rows,
            );
            return selected
                ? { id: selected.id, metric: selected.metric }
                : null;
        }) as never);
}

function deliverOrder() {
    return new PrismaOrderRepository().updateStatus("tenant-1", "order-1", {
        expectedStatus: "ENVIADO",
        status: "ENTREGADO",
        qualifyLoyalty: true,
    });
}

describe("ChangeOrderStatusUseCase", () => {
    test("guards delivery and requests loyalty qualification when enabled", async () => {
        const { useCase, orderRepository, featureRepository } = statusUseCase();

        const result = await useCase.execute(
            "tenant-1",
            "order-1",
            "ENTREGADO",
        );

        expect(orderRepository.updateStatus).toHaveBeenCalledWith(
            "tenant-1",
            "order-1",
            {
                expectedStatus: "ENVIADO",
                status: "ENTREGADO",
                qualifyLoyalty: true,
            },
        );
        expect(featureRepository.getTenantFeatureStatus).toHaveBeenCalledWith(
            "tenant-1",
        );
        expect(result.success).toBe(true);
    });

    test("does not qualify delivery when LOYALTY is disabled", async () => {
        const { useCase, orderRepository, featureRepository } = statusUseCase();
        featureRepository.getTenantFeatureStatus.mockResolvedValue({
            LOYALTY: false,
        });

        await useCase.execute("tenant-1", "order-1", "ENTREGADO");

        expect(orderRepository.updateStatus.mock.calls[0][2]).toEqual({
            expectedStatus: "ENVIADO",
            status: "ENTREGADO",
        });
    });

    test("does not look up loyalty for non-delivery transitions", async () => {
        const { useCase, orderRepository, featureRepository } =
            statusUseCase("PAGADO");
        orderRepository.updateStatus.mockResolvedValue(order("ENVIADO"));

        await useCase.execute("tenant-1", "order-1", "ENVIADO");

        expect(orderRepository.updateStatus).toHaveBeenCalledWith(
            "tenant-1",
            "order-1",
            {
                expectedStatus: "PAGADO",
                status: "ENVIADO",
            },
        );
        expect(featureRepository.getTenantFeatureStatus).not.toHaveBeenCalled();
    });

    test("reports a conflict when the expected delivery state is stale", async () => {
        const { useCase, orderRepository } = statusUseCase();
        orderRepository.updateStatus.mockResolvedValue(null);

        await expect(
            useCase.execute("tenant-1", "order-1", "ENTREGADO"),
        ).rejects.toMatchObject({
            code: BusinessErrorCodes.ORDER_STATUS_CONFLICT,
        });
    });
});

describe("Prisma order loyalty delivery transaction", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test.each([
        ["COUNT", "1.00"],
        ["SPEND", "19.90"],
    ] as const)(
        "upserts one generic %s ledger entry in the delivery transaction",
        async (metric, expectedValue) => {
            const transaction = useTransactionCallback();
            transaction.mockImplementation(
                (callback: (tx: typeof prisma) => Promise<unknown>) =>
                    callback(prisma),
            );
            const updateMany = jest
                .spyOn(prisma.order, "updateMany")
                .mockResolvedValue({ count: 1 });
            const findFirst = jest
                .spyOn(prisma.order, "findFirst")
                .mockResolvedValue(deliveredOrderRow() as never);
            const featureLookup = mockCommittedLoyaltyFeature();
            const campaignLookup = jest
                .spyOn(prisma.loyaltyCampaign, "findFirst")
                .mockResolvedValue({ id: "campaign-1", metric } as never);
            const upsert = jest
                .spyOn(prisma.loyaltyLedgerEntry, "upsert")
                .mockResolvedValue({} as never);

            await expect(
                new PrismaOrderRepository().updateStatus(
                    "tenant-1",
                    "order-1",
                    {
                        expectedStatus: "ENVIADO",
                        status: "ENTREGADO",
                        qualifyLoyalty: true,
                    },
                ),
            ).resolves.toMatchObject({
                id: "order-1",
                status: "ENTREGADO",
            });

            expect(transaction).toHaveBeenCalledTimes(1);
            expect(updateMany).toHaveBeenCalledWith({
                where: {
                    id: "order-1",
                    tenantId: "tenant-1",
                    status: "ENVIADO",
                },
                data: { status: "ENTREGADO" },
            });
            expect(findFirst).toHaveBeenCalledWith({
                where: {
                    id: "order-1",
                    tenantId: "tenant-1",
                    status: "ENTREGADO",
                },
                include: {
                    items: { include: { product: true } },
                    user: { select: { name: true, email: true } },
                },
            });
            expect(featureLookup).toHaveBeenCalledWith({
                where: {
                    tenantId: "tenant-1",
                    enabled: true,
                    feature: { key: "LOYALTY" },
                },
                select: { id: true },
            });
            const campaignWhere = (
                campaignLookup.mock.calls[0][0] as {
                    where: {
                        tenantId: string;
                        status: string;
                        source: { in: string[] };
                        startsAt: { lte: Date };
                        endsAt: { gt: Date };
                    };
                }
            ).where;
            expect(campaignWhere).toEqual({
                tenantId: "tenant-1",
                status: "ACTIVE",
                source: { in: ["STORE", "ALL"] },
                startsAt: { lte: expect.any(Date) },
                endsAt: { gt: expect.any(Date) },
            });
            expect(campaignWhere.startsAt.lte).toBe(campaignWhere.endsAt.gt);
            expect(upsert).toHaveBeenCalledWith({
                where: {
                    campaignId_sourceType_sourceId_entryType: {
                        campaignId: "campaign-1",
                        sourceType: "ORDER",
                        sourceId: "order-1",
                        entryType: "ACCRUAL",
                    },
                },
                create: {
                    tenantId: "tenant-1",
                    campaignId: "campaign-1",
                    userId: "order-owner",
                    sourceType: "ORDER",
                    sourceId: "order-1",
                    value: expectedValue,
                    entryType: "ACCRUAL",
                    reason: "order.delivered",
                    createdAt: campaignWhere.startsAt.lte,
                },
                update: {},
            });
        },
    );
});

describe("UpdateOrderUseCase", () => {
    test("delegates status changes to the guarded transition use case", async () => {
        const { useCase, orderRepository, featureRepository } =
            detailUpdateUseCase();

        const result = await useCase.execute("tenant-1", "order-1", {
            status: "ENTREGADO",
            trackingNumber: "TRACK-1",
        });

        expect(orderRepository.updateStatus).toHaveBeenCalledWith(
            "tenant-1",
            "order-1",
            {
                expectedStatus: "ENVIADO",
                status: "ENTREGADO",
                qualifyLoyalty: true,
                trackingNumber: "TRACK-1",
            },
        );
        expect(orderRepository.update).not.toHaveBeenCalled();
        expect(featureRepository.getTenantFeatureStatus).toHaveBeenCalledWith(
            "tenant-1",
        );
        expect(result.success).toBe(true);
    });

    test("rejects a status change that bypasses transition rules", async () => {
        const { useCase, orderRepository, featureRepository } =
            detailUpdateUseCase("PAGADO");

        await expect(
            useCase.execute("tenant-1", "order-1", {
                status: "ENTREGADO",
            }),
        ).rejects.toMatchObject({
            code: BusinessErrorCodes.INVALID_STATUS_TRANSITION,
        });
        expect(orderRepository.updateStatus).not.toHaveBeenCalled();
        expect(orderRepository.update).not.toHaveBeenCalled();
        expect(featureRepository.getTenantFeatureStatus).not.toHaveBeenCalled();
    });

    test("keeps tracking-only updates on the repository update path", async () => {
        const { useCase, orderRepository } = detailUpdateUseCase();

        await useCase.execute("tenant-1", "order-1", {
            trackingNumber: "TRACK-1",
        });

        expect(orderRepository.update).toHaveBeenCalledWith(
            "tenant-1",
            "order-1",
            { trackingNumber: "TRACK-1" },
        );
        expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    });
});

describe("Prisma order loyalty delivery edge cases", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("commits delivery without qualification when LOYALTY is disabled in-transaction", async () => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });
        jest.spyOn(prisma.order, "findFirst").mockResolvedValue(
            deliveredOrderRow() as never,
        );
        const featureLookup = mockCommittedLoyaltyFeature(false);
        const campaignLookup = jest.spyOn(prisma.loyaltyCampaign, "findFirst");
        const upsert = jest.spyOn(prisma.loyaltyLedgerEntry, "upsert");

        await expect(
            new PrismaOrderRepository().updateStatus("tenant-1", "order-1", {
                expectedStatus: "ENVIADO",
                status: "ENTREGADO",
                qualifyLoyalty: true,
            }),
        ).resolves.toMatchObject({ status: "ENTREGADO" });

        expect(transaction).toHaveBeenCalledTimes(1);
        expect(featureLookup).toHaveBeenCalledTimes(1);
        expect(campaignLookup).not.toHaveBeenCalled();
        expect(upsert).not.toHaveBeenCalled();
    });

    test("does not write a ledger entry without an active campaign", async () => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });
        jest.spyOn(prisma.order, "findFirst").mockResolvedValue(
            deliveredOrderRow() as never,
        );
        mockCommittedLoyaltyFeature();
        jest.spyOn(prisma.loyaltyCampaign, "findFirst").mockResolvedValue(null);
        const upsert = jest.spyOn(prisma.loyaltyLedgerEntry, "upsert");

        await new PrismaOrderRepository().updateStatus("tenant-1", "order-1", {
            expectedStatus: "ENVIADO",
            status: "ENTREGADO",
            qualifyLoyalty: true,
        });

        expect(upsert).not.toHaveBeenCalled();
    });

    test("allows only one concurrent delivery to qualify", async () => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        const updateMany = jest
            .spyOn(prisma.order, "updateMany")
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 0 });
        jest.spyOn(prisma.order, "findFirst").mockResolvedValue(
            deliveredOrderRow() as never,
        );
        mockCommittedLoyaltyFeature();
        const campaignLookup = jest
            .spyOn(prisma.loyaltyCampaign, "findFirst")
            .mockResolvedValue({ id: "campaign-1", metric: "COUNT" } as never);
        const upsert = jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never);
        const repository = new PrismaOrderRepository();
        const update = {
            expectedStatus: "ENVIADO" as const,
            status: "ENTREGADO" as const,
            qualifyLoyalty: true as const,
        };

        const results = await Promise.all([
            repository.updateStatus("tenant-1", "order-1", update),
            repository.updateStatus("tenant-1", "order-1", update),
        ]);

        expect(results[0]?.status).toBe("ENTREGADO");
        expect(results[1]).toBeNull();
        expect(updateMany).toHaveBeenCalledTimes(2);
        expect(campaignLookup).toHaveBeenCalledTimes(1);
        expect(upsert).toHaveBeenCalledTimes(1);
    });

    test("does not qualify a stale guarded transition", async () => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 0 });
        const findFirst = jest.spyOn(prisma.order, "findFirst");
        const campaignLookup = jest.spyOn(prisma.loyaltyCampaign, "findFirst");
        const upsert = jest.spyOn(prisma.loyaltyLedgerEntry, "upsert");

        await expect(
            new PrismaOrderRepository().updateStatus("tenant-1", "order-1", {
                expectedStatus: "ENVIADO",
                status: "ENTREGADO",
                qualifyLoyalty: true,
            }),
        ).resolves.toBeNull();
        expect(findFirst).not.toHaveBeenCalled();
        expect(campaignLookup).not.toHaveBeenCalled();
        expect(upsert).not.toHaveBeenCalled();
    });

    test("propagates a ledger failure from the delivery transaction", async () => {
        const error = new Error("ledger write failed");
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });
        jest.spyOn(prisma.order, "findFirst").mockResolvedValue(
            deliveredOrderRow() as never,
        );
        mockCommittedLoyaltyFeature();
        jest.spyOn(prisma.loyaltyCampaign, "findFirst").mockResolvedValue({
            id: "campaign-1",
            metric: "SPEND",
        } as never);
        jest.spyOn(prisma.loyaltyLedgerEntry, "upsert").mockRejectedValue(
            error,
        );

        await expect(
            new PrismaOrderRepository().updateStatus("tenant-1", "order-1", {
                expectedStatus: "ENVIADO",
                status: "ENTREGADO",
                qualifyLoyalty: true,
            }),
        ).rejects.toBe(error);
    });
});

describe("Prisma order campaign selection", () => {
    const eventAt = new Date("2030-01-15T12:00:00.000Z");

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(eventAt);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    function givenCommittedDelivery(rows: CampaignRow[]) {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });
        jest.spyOn(prisma.order, "findFirst").mockResolvedValue(
            deliveredOrderRow() as never,
        );
        mockCommittedLoyaltyFeature();
        return {
            lookup: selectCampaignOver(rows),
            upsert: jest
                .spyOn(prisma.loyaltyLedgerEntry, "upsert")
                .mockResolvedValue({} as never),
        };
    }

    test("accrues the delivered order into the eligible campaign", async () => {
        const { lookup, upsert } = givenCommittedDelivery([
            campaignRow({ id: "campaign-store" }),
        ]);

        await deliverOrder();

        expect(upsert).toHaveBeenCalledTimes(1);
        expect(upsert.mock.calls[0][0].create).toMatchObject({
            campaignId: "campaign-store",
            sourceType: "ORDER",
            sourceId: "order-1",
            entryType: "ACCRUAL",
            reason: "order.delivered",
            createdAt: eventAt,
        });
        const emitted = lookup.mock.calls[0][0] as CampaignSelectionQuery;
        expect(selectCampaign(emitted, competingCampaigns())).toMatchObject({
            id: "campaign-store-newer",
        });
    });

    test.each([["STORE"], ["ALL"]])(
        "maps an ORDER event onto its own source and the catch-all",
        async (rowSource) => {
            const rows = [
                campaignRow({ id: "campaign-booking-only", source: "BOOKING" }),
                campaignRow({
                    id: "campaign-elsewhere",
                    source: rowSource,
                    startsAt: new Date("2029-01-01T00:00:00.000Z"),
                }),
            ];
            const { lookup, upsert } = givenCommittedDelivery(rows);

            await deliverOrder();

            const emitted = lookup.mock.calls[0][0] as CampaignSelectionQuery;
            expect(emitted.where.source.in).toEqual(["STORE", "ALL"]);
            expect(upsert.mock.calls[0][0].create.campaignId).toBe(
                "campaign-elsewhere",
            );
        },
    );

    test("never accrues an ORDER event into a BOOKING-only campaign", async () => {
        const { upsert } = givenCommittedDelivery([
            campaignRow({ id: "campaign-booking-only", source: "BOOKING" }),
        ]);

        await deliverOrder();

        expect(upsert).not.toHaveBeenCalled();
    });

    test("accrues into the catch-all when no source-specific campaign is eligible", async () => {
        const { upsert } = givenCommittedDelivery([
            campaignRow({ id: "campaign-booking-only", source: "BOOKING" }),
            campaignRow({ id: "campaign-all", source: "ALL" }),
        ]);

        await deliverOrder();

        expect(upsert.mock.calls[0][0].create.campaignId).toBe("campaign-all");
    });

    test("accrues into the newest start when two eligible campaigns overlap", async () => {
        const { upsert } = givenCommittedDelivery([
            campaignRow({ id: "campaign-store-older" }),
            campaignRow({
                id: "campaign-store-newer",
                startsAt: new Date("2030-01-01T00:00:00.000Z"),
            }),
        ]);

        await deliverOrder();

        expect(upsert.mock.calls[0][0].create.campaignId).toBe(
            "campaign-store-newer",
        );
    });

    test.each([
        [
            "a window that ended before the event",
            new Date("2029-12-31T00:00:00.000Z"),
        ],
        [
            "a window that starts after the event",
            new Date("2030-06-01T00:00:00.000Z"),
        ],
    ])("accrues nowhere into %s", async (_label, bound) => {
        const { upsert } = givenCommittedDelivery([
            campaignRow({
                id: "campaign-outside",
                startsAt:
                    bound.getTime() > eventAt.getTime()
                        ? bound
                        : new Date("2029-01-01T00:00:00.000Z"),
                endsAt:
                    bound.getTime() > eventAt.getTime()
                        ? new Date("2030-12-31T00:00:00.000Z")
                        : bound,
            }),
        ]);

        await deliverOrder();

        expect(upsert).not.toHaveBeenCalled();
    });

    test("accrues nowhere into a non-ACTIVE campaign", async () => {
        const { upsert } = givenCommittedDelivery([
            campaignRow({ id: "campaign-ended", status: "ENDED" }),
        ]);

        await deliverOrder();

        expect(upsert).not.toHaveBeenCalled();
    });

    test("accrues nowhere into another tenant's campaign", async () => {
        const { upsert } = givenCommittedDelivery([
            campaignRow({ id: "campaign-other-tenant", tenantId: "tenant-2" }),
        ]);

        await deliverOrder();

        expect(upsert).not.toHaveBeenCalled();
    });
});
