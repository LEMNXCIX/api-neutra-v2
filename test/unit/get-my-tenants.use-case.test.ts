import { GetMyTenantsUseCase } from "@/core/application/tenant/get-my-tenants.use-case";

const MINE = [
    { id: "t1", name: "Tienda de gatos", slug: "gatos" },
    { id: "t2", name: "Barbería Leo", slug: "barberia-leo" },
];

function setup(tenants: unknown[] = MINE) {
    const tenantRepository = {
        findCreatedByUserId: jest.fn().mockResolvedValue(tenants),
    };
    const useCase = new GetMyTenantsUseCase(tenantRepository as never);
    return { useCase, tenantRepository };
}

describe("GetMyTenantsUseCase", () => {
    test("returns exactly the tenants the repository resolved", async () => {
        const { useCase } = setup();

        const result = await useCase.execute("user-1");

        expect(result.success).toBe(true);
        expect(result.data).toEqual(MINE);
    });

    test("scopes the query to the given user id", async () => {
        const { useCase, tenantRepository } = setup();

        await useCase.execute("user-1");

        expect(tenantRepository.findCreatedByUserId).toHaveBeenCalledWith("user-1");
    });

    test("returns an empty list when the user created none", async () => {
        const { useCase } = setup([]);

        const result = await useCase.execute("lonely");

        expect(result.data).toEqual([]);
    });
});
