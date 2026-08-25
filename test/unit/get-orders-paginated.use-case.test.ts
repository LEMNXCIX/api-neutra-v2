import { GetOrdersPaginatedUseCase } from "@/core/application/order/get-orders-paginated.use-case";

function setup(repoResult?: unknown) {
    const orderRepository = {
        findAllPaginated: jest.fn().mockResolvedValue(
            repoResult ?? {
                orders: [{ id: "o1" }, { id: "o2" }],
                total: 25,
                page: 1,
                limit: 10,
                totalPages: 3,
            },
        ),
    };
    const useCase = new GetOrdersPaginatedUseCase(
        orderRepository as never,
    );
    return { useCase, orderRepository };
}

describe("GetOrdersPaginatedUseCase", () => {
    test("returns orders with pagination metadata", async () => {
        const { useCase, orderRepository } = setup();

        const result = await useCase.execute("t1", { page: 2, limit: 10 });

        expect(orderRepository.findAllPaginated).toHaveBeenCalledWith(
            "t1",
            expect.objectContaining({ page: 2, limit: 10, status: "all" }),
        );
        expect(result.data).toEqual([
            { id: "o1" },
            { id: "o2" },
        ]);
        expect(result.meta?.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
        });
    });

    test("applies defaults when no options are given", async () => {
        const { useCase, orderRepository } = setup();

        await useCase.execute("t1", {});

        expect(orderRepository.findAllPaginated).toHaveBeenCalledWith(
            "t1",
            expect.objectContaining({ page: 1, limit: 10, status: "all" }),
        );
    });

    test("forwards search and status filters", async () => {
        const { useCase, orderRepository } = setup();

        await useCase.execute("t1", { search: "abc", status: "PENDIENTE" });

        expect(orderRepository.findAllPaginated).toHaveBeenCalledWith(
            "t1",
            expect.objectContaining({ search: "abc", status: "PENDIENTE" }),
        );
    });
});
