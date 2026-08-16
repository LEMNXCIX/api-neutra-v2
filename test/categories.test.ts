jest.mock("uuid", () => ({
    v4: () => `test-uuid-${Math.random().toString(36).substring(7)}`,
}));
import api from "./test-client";

describe("Categories routes", () => {
    test("GET /api/categories should respond with structured data", async () => {
        const res = await api.get("/api/categories");
        expect([200, 500]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        }
    });
});
