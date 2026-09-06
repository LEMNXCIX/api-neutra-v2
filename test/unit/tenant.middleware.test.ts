// Multi-tenant resolution middleware
process.env.NODE_ENV = "development";
process.env.WHATSAPP_VERIFY_TOKEN = "whatsapp-token";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createTenantMiddleware } = require("@/middleware/tenant.middleware");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TENANT_CONSTANTS } = require("@/core/domain/constants");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: config } = require("@/config/index.config");

// Other test files may have cached config with NODE_ENV=test, which makes the
// middleware short-circuit tenant resolution. Force the real logic here.
const originalConfigEnv = config.env;
config.env = "development";
afterAll(() => {
    config.env = originalConfigEnv;
});

type Req = {
    originalUrl: string;
    headers: Record<string, string | undefined>;
    cookies?: Record<string, string>;
    tenantId?: string;
    tenant?: unknown;
};

function createRes() {
    const res: Record<string, unknown> = {};
    res.status = jest.fn((code: number) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((body: unknown) => {
        res.body = body;
        return res;
    });
    return res;
}

function setup(environment: string, repoOverrides?: Partial<{ findBySlug: unknown; findById: unknown }>) {
    const tenantRepository = {
        findBySlug: repoOverrides?.findBySlug ?? jest.fn().mockResolvedValue(null),
        findById: repoOverrides?.findById ?? jest.fn().mockResolvedValue(null),
    };
    const mw = createTenantMiddleware({
        tenantRepository: tenantRepository as never,
        environment,
    });
    return { mw, tenantRepository };
}

async function run(mw: ReturnType<typeof createTenantMiddleware>, req: Req) {
    const res = createRes();
    const next = jest.fn();
    await mw(req as never, res as never, next);
    return { res, next };
}

const activeTenant = { id: "t1", name: "Store", slug: "store1", type: "STORE", active: true };

describe("tenant middleware", () => {
    test("resolves tenant from x-tenant-slug header", async () => {
        const { mw, tenantRepository } = setup("prod", {
            findBySlug: jest.fn().mockResolvedValue(activeTenant),
        });
        const { next } = await run(mw, {
            originalUrl: "/api/products",
            headers: { "x-tenant-slug": "store1" },
        });

        expect(tenantRepository.findBySlug).toHaveBeenCalledWith("store1");
        expect(next).toHaveBeenCalled();
    });

    test("404 for unknown tenant", async () => {
        const { mw, tenantRepository } = setup("prod");
        const { res, next } = await run(mw, {
            originalUrl: "/api/products",
            headers: { "x-tenant-slug": "ghost" },
        });

        expect(tenantRepository.findBySlug).toHaveBeenCalledWith("ghost");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
    });

    test("403 for inactive tenant", async () => {
        const { mw } = setup("prod", {
            findBySlug: jest.fn().mockResolvedValue({ ...activeTenant, active: false }),
        });
        const { res, next } = await run(mw, {
            originalUrl: "/api/products",
            headers: { "x-tenant-slug": "store1" },
        });

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("resolves subdomain from hostname", async () => {
        const { mw, tenantRepository } = setup("prod", {
            findBySlug: jest.fn().mockResolvedValue(activeTenant),
        });
        await run(mw, {
            originalUrl: "/api/products",
            headers: { host: "store1.example.com" },
        });

        expect(tenantRepository.findBySlug).toHaveBeenCalledWith("store1");
    });

    test("ignores IP hosts for subdomain resolution", async () => {
        const { mw, tenantRepository } = setup("prod");
        const { res } = await run(mw, {
            originalUrl: "/api/products",
            headers: { host: "192.168.1.1" },
        });

        expect(tenantRepository.findBySlug).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test("falls back to superadmin slug in development without headers", async () => {
        const { mw, tenantRepository } = setup("dev", {
            findBySlug: jest.fn().mockResolvedValue(activeTenant),
        });
        await run(mw, {
            originalUrl: "/api/products",
            headers: { host: "localhost:4000" },
        });

        expect(tenantRepository.findBySlug).toHaveBeenCalledWith(
            TENANT_CONSTANTS.SUPERADMIN_SLUG,
        );
    });

    test("skips non-api paths", async () => {
        const { mw, tenantRepository } = setup("prod");
        const { next } = await run(mw, {
            originalUrl: "/some-page",
            headers: { "x-tenant-slug": "store1" },
        });

        expect(tenantRepository.findBySlug).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    test("resolves by slug when both id and slug headers are present", async () => {
        const { mw, tenantRepository } = setup("prod", {
            findBySlug: jest.fn().mockResolvedValue(activeTenant),
        });
        await run(mw, {
            originalUrl: "/api/products",
            headers: { "x-tenant-id": "t1", "x-tenant-slug": "store1" },
        });

        expect(tenantRepository.findBySlug).toHaveBeenCalledWith("store1");
        expect(tenantRepository.findById).not.toHaveBeenCalled();
    });
});

export {};
