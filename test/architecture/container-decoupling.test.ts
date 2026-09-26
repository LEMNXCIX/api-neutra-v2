import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const middlewareFiles = [
    "middleware/tenant.middleware.ts",
    "middleware/tenant-feature.middleware.ts",
    "middleware/authenticate.middleware.ts",
    "middleware/optional-authenticate.middleware.ts",
    "middleware/error.middleware.ts",
    "middleware/request.middleware.ts",
    "middleware/response.middleware.ts",
    "middleware/cors.middleware.ts",
    "infrastructure/providers/pino-logger.provider.ts",
];

describe("middleware/container decoupling", () => {
    test("middleware modules do not import Container", () => {
        for (const relativePath of middlewareFiles) {
            const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
            expect(source).not.toMatch(
                /from\s+["'][^"']*infrastructure\/config\/container["']/,
            );
            expect(source).not.toMatch(/\bContainer\b/);
        }
    });

    test("notification worker exposes a Container-free factory", () => {
        const source = fs.readFileSync(
            path.join(ROOT, "infrastructure/workers/notification.worker.ts"),
            "utf8",
        );

        expect(source).not.toMatch(
            /from\s+["'][^"']*infrastructure\/config\/container["']/,
        );
        expect(source).toContain("export function createNotificationWorker");
    });

    test("queue service exposes explicit queue factories without module-level instances", () => {
        const source = fs.readFileSync(
            path.join(ROOT, "infrastructure/services/queue.service.ts"),
            "utf8",
        );

        expect(source).not.toMatch(
            /export\s+const\s+\w+\s*=\s*new\s+Queue/,
        );
        expect(source).toContain("export function createNotificationQueue");
        expect(source).toContain("export function createMaintenanceQueue");
    });

    test("appointment review worker exposes a Container-free factory", () => {
        const source = fs.readFileSync(
            path.join(ROOT, "infrastructure/workers/appointment-review.worker.ts"),
            "utf8",
        );

        expect(source).not.toMatch(
            /from\s+["'][^"']*infrastructure\/config\/container["']/,
        );
        expect(source).toContain("export function createAppointmentReviewWorker");
    });

    test("explicit runtime composition exposes factories without Container", () => {
        const runtime = fs.readFileSync(
            path.join(ROOT, "infrastructure/config/runtime.ts"),
            "utf8",
        );
        const controllers = fs.readFileSync(
            path.join(ROOT, "infrastructure/config/http-controllers/index.ts"),
            "utf8",
        );
        const app = fs.readFileSync(path.join(ROOT, "app.ts"), "utf8");

        expect(runtime).toContain("export function createRuntime");
        expect(controllers).toContain("export function createHttpControllers");
        expect(app).not.toMatch(
            /from\s+["'][^"']*infrastructure\/config\/container["']/,
        );
        expect(app).not.toMatch(/\bContainer\b/);
    });

    test("logger ownership is explicit across composition boundaries", () => {
        const files = {
            runtime: "infrastructure/config/runtime.ts",
            email: "infrastructure/services/email.service.ts",
            nodemailer: "infrastructure/providers/nodemailer.provider.ts",
            webhook: "infrastructure/webhooks/whatsapp-webhook.controller.ts",
            wideLog: "middleware/wide-log.middleware.ts",
            tenant: "middleware/tenant.middleware.ts",
            worker: "infrastructure/workers/appointment-review.worker.ts",
            db: "config/db.config.ts",
            app: "app.ts",
        };
        const sources = Object.fromEntries(
            Object.entries(files).map(([key, file]) => [
                key,
                fs.readFileSync(path.join(ROOT, file), "utf8"),
            ]),
        ) as Record<string, string>;

        expect(sources.runtime).not.toMatch(/logger\.instance/);
        expect(sources.email).toMatch(/createEmailService\(logger: ILogger\)/);
        expect(sources.nodemailer).toMatch(/constructor\(private readonly logger: ILogger\)/);
        expect(sources.webhook).toMatch(/private readonly logger: ILogger/);
        expect(sources.wideLog).toMatch(/logger: ILogger/);
        expect(sources.tenant).toMatch(/logger: ILogger/);
        expect(sources.worker).toMatch(/logger: ILogger/);
        expect(sources.db).toMatch(/connection = async function \(logger: ILogger\)/);
        expect(sources.app).toContain(
            "connection(runtime.providers.logger)",
        );
    });

    test("logger-backed middleware uses injected providers", () => {
        for (const relativePath of [
            "middleware/error.middleware.ts",
            "middleware/request.middleware.ts",
            "middleware/response.middleware.ts",
            "middleware/cors.middleware.ts",
        ]) {
            const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
            expect(source).not.toMatch(/helpers\/logger\.helpers/);
            expect(source).not.toMatch(/new\s+PinoLoggerProvider/);
        }

        const pino = fs.readFileSync(
            path.join(ROOT, "infrastructure/providers/pino-logger.provider.ts"),
            "utf8",
        );
        expect(pino).not.toMatch(/helpers\/logger\.helpers/);
        expect(pino).toContain("private readonly logger: Logger");
    });

    test("runtime sources do not depend on the helper logger", () => {
        for (const relativePath of [
            "infrastructure/config/runtime.ts",
            "infrastructure/providers/pino-logger.provider.ts",
            "infrastructure/providers/redis.provider.ts",
            "middleware/optional-authenticate.factory.ts",
            "infrastructure/services/whatsapp.service.ts",
            "infrastructure/services/whatsapp-bot.service.ts",
            "app.ts",
        ]) {
            const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
            expect(source).not.toMatch(/helpers\/logger\.helpers/);
        }
    });

    test("app composes explicit middleware bindings before route registration", () => {
        const source = fs.readFileSync(path.join(ROOT, "app.ts"), "utf8");
        const bindings = [
            "const authenticate = createAuthenticateMiddleware(",
            "const optionalAuthenticate = createOptionalAuthenticateMiddleware(",
            "const requireTenantFeature = createRequireTenantFeature(",
            "const tenantMiddleware = createTenantMiddleware(",
        ];
        const firstRoute = source.indexOf('healthRoutes(app');

        expect(firstRoute).toBeGreaterThanOrEqual(0);
        for (const binding of bindings) {
            const bindingIndex = source.indexOf(binding);
            expect(bindingIndex).toBeGreaterThanOrEqual(0);
            expect(bindingIndex).toBeLessThan(firstRoute);
        }
    });
});
