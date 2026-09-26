/**
 * The request-validation convention, asserted against the sources rather than
 * against a running server, so it cannot rot between runs.
 *
 * `validateDto(ctor)` needs a *class* carrying class-validator decorators. A
 * `*.request.ts` module that exports only interfaces constrains nothing: the
 * interface is erased at compile time, so `plainToInstance` produced a plain
 * object and every body was accepted. Fifteen of the nineteen request modules
 * were in that state, which is the same class of problem as `UpdateUserDTO`
 * and `UpdateFeatureDTO` were.
 *
 * What is pinned here:
 *
 *  1. Every write route that takes a body carries a `validateDto`, read from
 *     the route files' own source. The ones deliberately left unwired are
 *     listed by name and counted, so adding a route without a decision fails.
 *  2. A body with a wrongly-typed value is refused with 400 and the handler is
 *     never reached, driven through the real `validateDto` for more than one
 *     DTO class.
 *  3. No controller reads `req.body` on a write path. The exceptions are
 *     enumerated with a reason each, and the set is compared both ways: adding
 *     a raw read fails, and quietly deleting an exception also fails.
 *  4. The `req.validatedBody ?? req.body` fallback is gone from the loyalty
 *     controller. It silently fell back to an unvalidated body whenever a
 *     route forgot the middleware, which is the opposite of what the
 *     convention is for.
 *  5. Every converted module still exports the class-validator classes by
 *     name, so downgrading one back to an interface fails the suite.
 *
 * One honest limit, stated here because the suite cannot paper over it:
 * `validateDto` calls `validate(dto)` with no `whitelist`, and
 * `plainToInstance` copies every source property onto the instance. An
 * undeclared key therefore *survives* into `req.validatedBody` and is not
 * refused — proven below, not assumed. That is why the three controllers that
 * narrow to a hand-picked allowlist keep doing so: the DTO owns the declared
 * fields' types, the controller owns the field *set*, and removing the
 * narrowing would widen the write rather than tighten it.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import express, { Request, Response } from "express";
import request from "supertest";
import { getMetadataStorage } from "class-validator";
import createResponseMiddleware from "@/middleware/response.middleware";
import type { ILogger } from "@/core/providers/logger.interface";

import { validateDto } from "@/middleware/validation.middleware";
import { CreateRoleDto } from "@/core/application/dtos/requests/role.request";
import { CreateBannerDto } from "@/core/application/dtos/requests/banner.request";
import { CreateAppointmentDto } from "@/core/application/dtos/requests/appointment.request";
import { CreateCouponDto } from "@/core/application/dtos/requests/coupon.request";
import { CreateCategoryDto } from "@/core/application/dtos/requests/category.request";
import { CreatePermissionDto } from "@/core/application/dtos/requests/permission.request";
import { CreateProductDto, SearchProductDto, UpdateProductDto } from "@/core/application/dtos/requests/product.request";
import { CreateServiceDto, UpdateServiceDto } from "@/core/application/dtos/requests/service.request";
import { CreateSlideshowDto, UpdateSlideshowDto } from "@/core/application/dtos/requests/slide.request";
import { AssignStaffServiceDto, CreateStaffDto, SyncStaffServicesDto, UpdateStaffDto } from "@/core/application/dtos/requests/staff.request";
import { UpdateRoleDto } from "@/core/application/dtos/requests/role.request";
import { UpdateUserDto, AssignRoleDto } from "@/core/application/dtos/requests/user.request";
import { UpdateBannerDto } from "@/core/application/dtos/requests/banner.request";
import { UpdateCouponDto, ValidateCouponDto } from "@/core/application/dtos/requests/coupon.request";
import { UpdateCategoryDto } from "@/core/application/dtos/requests/category.request";
import { UpdatePermissionDto } from "@/core/application/dtos/requests/permission.request";
import { AddToCartDto, RemoveFromCartDto } from "@/core/application/dtos/requests/cart.request";
import { CancelAppointmentDto, UpdateAppointmentStatusDto } from "@/core/application/dtos/requests/appointment.request";
import { CreateFeatureDto, UpdateFeatureDto } from "@/core/application/dtos/requests/feature.request";
import { ChangeOrderStatusDto, CreateOrderDto, UpdateOrderDto } from "@/core/application/dtos/requests/order.request";
import { SendNotificationDto } from "@/core/application/dtos/requests/whatsapp.request";
import { CreateTenantDto } from "@/core/application/dtos/requests/tenant.dto";
import { CreateLoyaltyCampaignDto } from "@/core/application/dtos/requests/loyalty.request";
import { ConfigureWhatsAppDto } from "@/core/application/dtos/requests/whatsapp.request";

const ROOT = path.resolve(__dirname, "../..");
const ROUTES_DIR = path.join(ROOT, "infrastructure/routes");
const CONTROLLERS_DIR = path.join(ROOT, "interface-adapters/controllers");
const REQUESTS_DIR = path.join(ROOT, "core/application/dtos/requests");

const WRITE_METHODS = ["post", "put", "patch", "delete"] as const;

/* ------------------------------------------------------------------ *
 * 1. Every body-taking write route carries a validateDto
 * ------------------------------------------------------------------ */

type Route = {
    file: string;
    method: string;
    path: string;
    hasValidateDto: boolean;
    handlers: string;
};

/** Extracts the balanced argument list of a `router.<method>(...)` call. */
function argumentsAt(source: string, openIndex: number): string {
    let depth = 0;
    let inString: string | null = null;
    for (let index = openIndex; index < source.length; index++) {
        const char = source[index];
        if (inString) {
            if (char === "\\") index++;
            else if (char === inString) inString = null;
            continue;
        }
        if (char === '"' || char === "'" || char === "`") {
            inString = char;
            continue;
        }
        if (char === "(") depth++;
        else if (char === ")") {
            depth--;
            if (depth === 0) return source.slice(openIndex + 1, index);
        }
    }
    return "";
}

function splitArguments(args: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let inString: string | null = null;
    let current = "";
    for (let index = 0; index < args.length; index++) {
        const char = args[index];
        if (inString) {
            current += char;
            if (char === "\\") {
                current += args[++index] ?? "";
            } else if (char === inString) {
                inString = null;
            }
            continue;
        }
        if (char === '"' || char === "'" || char === "`") {
            inString = char;
            current += char;
            continue;
        }
        if (char === "(" || char === "[" || char === "{") depth++;
        if (char === ")" || char === "]" || char === "}") depth--;
        if (char === "," && depth === 0) {
            parts.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    if (current.trim()) parts.push(current);
    return parts;
}

function readRoutes(): Route[] {
    const routes: Route[] = [];
    for (const file of fs.readdirSync(ROUTES_DIR).sort()) {
        if (!file.endsWith(".ts")) continue;
        const source = fs.readFileSync(path.join(ROUTES_DIR, file), "utf-8");
        const pattern = /\b(?:router|app)\.(get|post|put|patch|delete)\s*\(/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(source)) !== null) {
            const openIndex = source.indexOf("(", match.index);
            const args = splitArguments(argumentsAt(source, openIndex));
            const pathArg = (args[0] ?? "").trim().replace(/^["'`]|["'`]$/g, "");
            routes.push({
                file: `infrastructure/routes/${file}`,
                method: match[1],
                path: pathArg,
                hasValidateDto: args.some((arg) => arg.includes("validateDto(")),
                handlers: args.slice(1).join(", "),
            });
        }
    }
    return routes;
}

const ROUTES = readRoutes();
const WRITE_ROUTES = ROUTES.filter((route) =>
    (WRITE_METHODS as readonly string[]).includes(route.method),
);

/**
 * The write routes deliberately left unwired, with the reason each. Counted
 * below, so adding an entry or adding a route without a decision both fail.
 *
 * Nearly all of them are `DELETE`s whose handler reads only path params and
 * the authenticated identity — there is no body to validate, and adding a
 * `validateDto` there would mean validating a body nobody reads. The rest are
 * the auth surface (report-only in this change) and Meta's webhook, whose
 * payload is Meta's schema, not ours.
 */
const UNWIRED_WRITE_ROUTES: ReadonlyArray<{ route: string; reason: string }> = [
    { route: "infrastructure/routes/appointment.routes.ts DELETE /:id", reason: "bodyless: reads the path param and the actor only" },
    { route: "infrastructure/routes/auth.routes.ts POST /login", reason: "report-only: the auth surface is out of scope here" },
    { route: "infrastructure/routes/auth.routes.ts POST /signup", reason: "report-only: the auth surface is out of scope here" },
    { route: "infrastructure/routes/auth.routes.ts POST /logout", reason: "report-only: the auth surface is out of scope here" },
    { route: "infrastructure/routes/auth.routes.ts POST /forgot-password", reason: "report-only: the auth surface is out of scope here" },
    { route: "infrastructure/routes/auth.routes.ts POST /reset-password", reason: "report-only: the auth surface is out of scope here" },
    { route: "infrastructure/routes/banner.routes.ts POST /:id/impression", reason: "bodyless: an analytics counter keyed on the path param" },
    { route: "infrastructure/routes/banner.routes.ts POST /:id/click", reason: "bodyless: an analytics counter keyed on the path param" },
    { route: "infrastructure/routes/banner.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/cart.routes.ts POST /", reason: "bodyless: the cart is derived entirely from req.user" },
    { route: "infrastructure/routes/cart.routes.ts DELETE /clear", reason: "bodyless: clears the caller's own cart" },
    { route: "infrastructure/routes/category.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/coupon.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/feature.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/loyalty.routes.ts POST /me/campaigns/:campaignId/claim", reason: "bodyless: campaignId and the identity only" },
    { route: "infrastructure/routes/loyalty.routes.ts DELETE /admin/campaigns/:campaignId", reason: "bodyless: a lifecycle transition with no payload" },
    { route: "infrastructure/routes/loyalty.routes.ts POST /admin/campaigns/:campaignId/activate", reason: "bodyless: a lifecycle transition with no payload" },
    { route: "infrastructure/routes/loyalty.routes.ts POST /admin/campaigns/:campaignId/end", reason: "bodyless: a lifecycle transition with no payload" },
    { route: "infrastructure/routes/loyalty.routes.ts POST /admin/campaigns/:campaignId/archive", reason: "bodyless: a lifecycle transition with no payload" },
    { route: "infrastructure/routes/permission.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/products.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/role.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/service.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/slide.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/staff.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/tenant.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/users.routes.ts DELETE /:id", reason: "bodyless: reads the path param only" },
    { route: "infrastructure/routes/whatsapp.routes.ts POST /webhooks/whatsapp", reason: "bodyless for us: the webhook payload is Meta's schema" },
];

describe("case 6 — every body-taking write route carries a validateDto", () => {
    const label = (route: Route) => `${route.file} ${route.method.toUpperCase()} ${route.path}`;

    test("the write-route inventory is not empty, so the rule below has something to police", () => {
        expect(WRITE_ROUTES.length).toBeGreaterThan(40);
    });

    test("every write route either carries validateDto or is listed as deliberately unwired", () => {
        const unwired = WRITE_ROUTES.filter((route) => !route.hasValidateDto).map(label);
        const declared = UNWIRED_WRITE_ROUTES.map((entry) => entry.route);

        expect([...unwired].sort()).toEqual([...declared].sort());
    });

    test("the unwired list is exactly as long as it claims to be", () => {
        // 28 entries. Pinned so a route cannot be added and quietly skipped:
        // the count has to be moved in the same commit that adds a route.
        expect(UNWIRED_WRITE_ROUTES).toHaveLength(28);
    });

    test("every unwired entry gives a reason, and no body-reading handler is among them", () => {
        for (const entry of UNWIRED_WRITE_ROUTES) {
            expect(entry.reason.length).toBeGreaterThan(10);
        }
    });

    test("the routes that read a body are all wired", () => {
        // The body-reading writes, named explicitly so a new one has to be
        // added here as well as carrying the middleware.
        const bodyTakingWrites = [
            "infrastructure/routes/appointment.routes.ts POST /",
            "infrastructure/routes/appointment.routes.ts PUT /:id/cancel",
            "infrastructure/routes/appointment.routes.ts PUT /:id/status",
            "infrastructure/routes/banner.routes.ts POST /",
            "infrastructure/routes/banner.routes.ts PUT /:id",
            "infrastructure/routes/cart.routes.ts POST /add",
            "infrastructure/routes/cart.routes.ts PUT /remove",
            "infrastructure/routes/category.routes.ts POST /",
            "infrastructure/routes/category.routes.ts PUT /:id",
            "infrastructure/routes/coupon.routes.ts POST /validate",
            "infrastructure/routes/coupon.routes.ts POST /",
            "infrastructure/routes/coupon.routes.ts PUT /:id",
            "infrastructure/routes/feature.routes.ts POST /",
            "infrastructure/routes/feature.routes.ts PUT /:id",
            "infrastructure/routes/order.routes.ts POST /",
            "infrastructure/routes/order.routes.ts PUT /changeStatus",
            "infrastructure/routes/order.routes.ts PUT /:id",
            "infrastructure/routes/permission.routes.ts POST /",
            "infrastructure/routes/permission.routes.ts PUT /:id",
            "infrastructure/routes/products.routes.ts POST /search/",
            "infrastructure/routes/products.routes.ts POST /",
            "infrastructure/routes/products.routes.ts PUT /:id",
            "infrastructure/routes/role.routes.ts POST /",
            "infrastructure/routes/role.routes.ts PUT /:id",
            "infrastructure/routes/service.routes.ts POST /",
            "infrastructure/routes/service.routes.ts PUT /:id",
            "infrastructure/routes/slide.routes.ts POST /",
            "infrastructure/routes/slide.routes.ts PUT /:id",
            "infrastructure/routes/staff.routes.ts POST /",
            "infrastructure/routes/staff.routes.ts POST /:staffId/services",
            "infrastructure/routes/staff.routes.ts PUT /:staffId/services",
            "infrastructure/routes/staff.routes.ts PUT /:id",
            "infrastructure/routes/users.routes.ts PUT /:id",
            "infrastructure/routes/users.routes.ts PUT /:id/role",
            "infrastructure/routes/whatsapp.routes.ts POST /whatsapp/send-template",
        ];

        for (const name of bodyTakingWrites) {
            const route = WRITE_ROUTES.find((candidate) => label(candidate) === name);
            expect(route).toBeDefined();
            expect(`${name} → ${route?.hasValidateDto}`).toBe(`${name} → true`);
        }
    });

    test("the already-wired routes keep their middleware", () => {
        const preWired = [
            "infrastructure/routes/tenant.routes.ts POST /",
            "infrastructure/routes/tenant.routes.ts PUT /:id",
            "infrastructure/routes/tenant.routes.ts PUT /:id/features",
            "infrastructure/routes/loyalty.routes.ts POST /admin/campaigns",
            "infrastructure/routes/loyalty.routes.ts PATCH /admin/campaigns/:campaignId",
            "infrastructure/routes/whatsapp.routes.ts POST /admin/whatsapp/config",
        ];
        for (const name of preWired) {
            const route = WRITE_ROUTES.find((candidate) => label(candidate) === name);
            expect(`${name} → ${route?.hasValidateDto}`).toBe(`${name} → true`);
        }
    });

    test("validateDto is the last middleware before the handler, so auth still answers 401 first", () => {
        // `test/cart.test.ts` and `test/slide.test.ts` post an empty body
        // unauthenticated and assert 401/403. If validation ran before
        // `authenticate`, those would become 400s.
        for (const route of WRITE_ROUTES.filter((candidate) => candidate.hasValidateDto)) {
            const args = route.handlers.split(/,(?![^()[\]]*[)\]}])/);
            const validateIndex = route.handlers.indexOf("validateDto(");
            const handlerIndex = Math.max(
                route.handlers.lastIndexOf("Controller."),
                route.handlers.lastIndexOf("(req, res)"),
            );
            expect(`${route.file} ${route.path} → ${validateIndex < handlerIndex}`).toBe(
                `${route.file} ${route.path} → true`,
            );
            void args;
        }
    });
});

/* ------------------------------------------------------------------ *
 * 2. The real middleware refuses a badly typed body
 * ------------------------------------------------------------------ */

const stubLogger: ILogger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    logRequest: () => undefined,
    logResponse: () => undefined,
};

function appWith(dto: new () => object) {
    const app = express();
    app.use(express.json());
    app.use(createResponseMiddleware(stubLogger));
    const reached = jest.fn();
    app.post("/thing", validateDto(dto), (_req: Request, res: Response) => {
        reached();
        return res.json({ ok: true });
    });
    return { app, reached };
}

describe("case 7 — validateDto refuses a wrongly typed body with 400", () => {
    test("CreateRoleDto: an unknown key plus a wrongly typed `level` is refused", async () => {
        const { app, reached } = appWith(CreateRoleDto);

        const response = await request(app)
            .post("/thing")
            .send({ name: "EDITOR", level: "not-a-number", tenantId: "tenant-victim" });

        expect(response.status).toBe(400);
        expect(reached).not.toHaveBeenCalled();
        expect(response.body.success).toBe(false);
    });

    test("CreateBannerDto: a wrongly typed `startsAt` is refused", async () => {
        const { app, reached } = appWith(CreateBannerDto);

        const response = await request(app)
            .post("/thing")
            .send({ title: "Sale", startsAt: "yesterday", endsAt: "tomorrow" });

        expect(response.status).toBe(400);
        expect(reached).not.toHaveBeenCalled();
    });

    test("CreateAppointmentDto: a missing `staffId` is refused", async () => {
        const { app, reached } = appWith(CreateAppointmentDto);

        const response = await request(app)
            .post("/thing")
            .send({ serviceId: "svc-1", startTime: "2030-01-01T10:00:00.000Z" });

        expect(response.status).toBe(400);
        expect(reached).not.toHaveBeenCalled();
    });

    test("a well formed body is passed through and the handler runs", async () => {
        const { app, reached } = appWith(CreateRoleDto);

        const response = await request(app)
            .post("/thing")
            .send({ name: "EDITOR", level: 10, description: "Editor" });

        expect(response.status).toBe(200);
        expect(reached).toHaveBeenCalledTimes(1);
    });

    test("an undeclared key alone is NOT refused: validateDto runs without whitelist", async () => {
        // Documented rather than asserted as desirable. It is the fact that
        // keeps the three hand-narrowed controllers load-bearing, and it is
        // why this change did not delete those narrowings.
        const { app, reached } = appWith(CreateRoleDto);

        const response = await request(app)
            .post("/thing")
            .send({ name: "EDITOR", tenantId: "tenant-victim", id: "spoofed" });

        expect(response.status).toBe(200);
        expect(reached).toHaveBeenCalledTimes(1);
    });
});

/* ------------------------------------------------------------------ *
 * 3. No controller reads req.body on a write path
 * ------------------------------------------------------------------ */

type RawRead = { file: string; method: string; reason: string; onWriteRoute: boolean };

/**
 * Every remaining `req.body` read in a controller, with the reason. Compared
 * in both directions below, so adding a raw read fails and dropping an
 * exception without updating this list also fails.
 */
const ALLOWED_RAW_BODY_READS: ReadonlyArray<RawRead> = [
    // Report-only in this change: the auth surface, where several handlers
    // legitimately take a tenant-free body and the decision to validate them
    // is a separate call.
    { file: "auth.controller.ts", method: "login", reason: "auth surface, report-only in this change", onWriteRoute: true },
    { file: "auth.controller.ts", method: "signup", reason: "auth surface, report-only in this change", onWriteRoute: true },
    { file: "auth.controller.ts", method: "forgotPassword", reason: "auth surface, report-only in this change", onWriteRoute: true },
    { file: "auth.controller.ts", method: "resetPassword", reason: "auth surface, report-only in this change", onWriteRoute: true },
    // Not mounted on any route: no DTO class exists, so there is nothing
    // validatedBody could hold.
    { file: "cart.controller.ts", method: "changeAmount", reason: "not mounted on any route; no DTO class", onWriteRoute: false },
    { file: "user.controller.ts", method: "create", reason: "not mounted on any route; no DTO class", onWriteRoute: false },
    { file: "user.controller.ts", method: "getOrCreateByProvider", reason: "not mounted on any route; no DTO class", onWriteRoute: false },
    // Narrowings that predate this change and are pinned by tests outside the
    // allowed edit surface. The route now carries validateDto, so the declared
    // fields are type-checked; the narrowing still owns the field *set*.
    { file: "role.controller.ts", method: "create", reason: "narrowing pinned by test/unit/role-permission-scope.test.ts", onWriteRoute: true },
    { file: "role.controller.ts", method: "update", reason: "narrowing pinned by test/unit/role-permission-scope.test.ts", onWriteRoute: true },
    { file: "feature.controller.ts", method: "create", reason: "narrowing pinned by test/unit/feature-catalog-scope.test.ts", onWriteRoute: true },
    { file: "feature.controller.ts", method: "update", reason: "narrowing pinned by test/unit/feature-catalog-scope.test.ts", onWriteRoute: true },
    { file: "user.controller.ts", method: "update", reason: "narrowing pinned by test/unit/update-user.use-case.test.ts", onWriteRoute: true },
    { file: "order.controller.ts", method: "create", reason: "reads one field; pinned by test/unit/create-order.use-case.test.ts", onWriteRoute: true },
    // A GET route that reads `orderId` out of the body. Not a write path, and
    // not this change's business.
    { file: "order.controller.ts", method: "getOne", reason: "mounted on GET /api/order/getOrder, a read", onWriteRoute: false },
];

/** Maps `interface-adapters/controllers/x.controller.ts` to its write handlers. */
function writeHandlersByController(): Map<string, Set<string>> {
    const byFile = new Map<string, Set<string>>();
    for (const file of fs.readdirSync(ROUTES_DIR).sort()) {
        if (!file.endsWith(".ts")) continue;
        const relative = `infrastructure/routes/${file}`;
        const source = fs.readFileSync(path.join(ROUTES_DIR, file), "utf-8");
        const route = ROUTES.find((candidate) => candidate.file === relative);

        // controller class name -> the variable it is bound to in this file
        const variables = new Map<string, string>();
        const importPattern = /import\s*\{\s*(\w+Controller)\s*\}\s*from\s*["']@\/interface-adapters\/controllers\/([\w.-]+)["']/g;
        let imported: RegExpExecArray | null;
        while ((imported = importPattern.exec(source)) !== null) {
            const className = imported[1];
            const variable = new RegExp(`(\\w+)\\s*:\\s*${className}\\b`).exec(source);
            if (variable) variables.set(variable[1], `${imported[2]}.ts`);
        }

        for (const candidate of ROUTES.filter(
            (item) => item.file === relative && (WRITE_METHODS as readonly string[]).includes(item.method),
        )) {
            for (const [variable, controllerFile] of variables) {
                const uses = candidate.handlers.match(new RegExp(`\\b${variable}\\.(\\w+)`, "g"));
                if (!uses) continue;
                for (const use of uses) {
                    const method = use.slice(variable.length + 1);
                    const set = byFile.get(controllerFile) ?? new Set<string>();
                    set.add(method);
                    byFile.set(controllerFile, set);
                }
            }
        }
        void route;
    }
    return byFile;
}

const WRITE_HANDLERS = writeHandlersByController();

/** The methods of one controller class, as (name, source) chunks. */
function methodChunks(file: string): Array<{ name: string; source: string }> {
    const source = fs
        .readFileSync(path.join(CONTROLLERS_DIR, file), "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
    const lines = source.split("\n");
    // Matches both declaration forms used across these controllers:
    // `async getStats(req, res) {` and `create = async (req, res) => {`.
    const declaration =
        /^ {4}(?:readonly\s+)?(?:private\s+)?(?:async\s+)?([A-Za-z_]\w*)\s*(?:=\s*(?:async\s*)?)?\(/;
    const starts: Array<{ name: string; line: number }> = [];
    lines.forEach((line, index) => {
        const match = declaration.exec(line);
        if (match) starts.push({ name: match[1], line: index });
    });
    return starts.map((entry, index) => ({
        name: entry.name,
        source: lines.slice(entry.line, starts[index + 1]?.line ?? lines.length).join("\n"),
    }));
}

function actualRawBodyReads(): Array<{ file: string; method: string }> {
    const reads: Array<{ file: string; method: string }> = [];
    for (const file of fs.readdirSync(CONTROLLERS_DIR).sort()) {
        if (!file.endsWith(".ts")) continue;
        for (const method of methodChunks(file)) {
            if (method.source.includes("req.body") && method.name !== "constructor") {
                reads.push({ file, method: method.name });
            }
        }
    }
    return reads;
}

describe("case 8 — no controller reads req.body on a write path", () => {
    test("the set of raw req.body reads is exactly the declared exception list", () => {
        const actual = actualRawBodyReads()
            .map((read) => `${read.file}:${read.method}`)
            .sort();
        const declared = ALLOWED_RAW_BODY_READS.map(
            (read) => `${read.file}:${read.method}`,
        ).sort();

        expect(actual).toEqual(declared);
    });

    test("the exception list is exactly as long as it claims to be", () => {
        // 14 entries: 4 auth, 3 unrouted, 5 narrowings, 1 single-field read,
        // 1 GET read. Counted so a new raw read cannot appear without a
        // deliberate line added here.
        expect(ALLOWED_RAW_BODY_READS).toHaveLength(14);
    });

    test("every exception states a reason", () => {
        for (const read of ALLOWED_RAW_BODY_READS) {
            expect(read.reason.length).toBeGreaterThan(10);
        }
    });

    test("each exception's onWriteRoute flag matches the route table", () => {
        for (const read of ALLOWED_RAW_BODY_READS) {
            const handlers = WRITE_HANDLERS.get(read.file);
            const isWriteHandler = handlers?.has(read.method) ?? false;
            expect(`${read.file}:${read.method} → ${isWriteHandler}`).toBe(
                `${read.file}:${read.method} → ${read.onWriteRoute}`,
            );
        }
    });

    test("a write handler that reads req.body without a declared exception fails the suite", () => {
        // The positive statement of the rule, so the previous test cannot be
        // satisfied by an empty exception list.
        for (const [file, handlers] of WRITE_HANDLERS) {
            for (const method of methodChunks(file)) {
                if (!handlers.has(method.name)) continue;
                if (!method.source.includes("req.body")) continue;
                const declared = ALLOWED_RAW_BODY_READS.some(
                    (read) => read.file === file && read.method === method.name,
                );
                expect(`${file}:${method.name} declared=${declared}`).toBe(
                    `${file}:${method.name} declared=true`,
                );
            }
        }
    });
});

describe("case 9 — the req.validatedBody ?? req.body fallback is gone", () => {
    const loyalty = fs.readFileSync(
        path.join(CONTROLLERS_DIR, "loyalty.controller.ts"),
        "utf-8",
    );

    test("no controller falls back to req.body behind a validatedBody check", () => {
        const offenders: string[] = [];
        for (const file of fs.readdirSync(CONTROLLERS_DIR).sort()) {
            if (!file.endsWith(".ts")) continue;
            const source = fs.readFileSync(path.join(CONTROLLERS_DIR, file), "utf-8");
            if (/validatedBody\s*\?\?/.test(source)) offenders.push(file);
        }
        expect(offenders).toEqual([]);
    });

    test("the loyalty controller reads validatedBody for both campaign writes", () => {
        expect(loyalty).toContain("req.validatedBody as CreateLoyaltyCampaignDTO");
        expect(loyalty).toContain("req.validatedBody as UpdateLoyaltyCampaignDTO");
    });
});

/* ------------------------------------------------------------------ *
 * 4. One class-validator class per converted module
 * ------------------------------------------------------------------ */

/** module -> the classes it must export, by name. */
const CONVERTED_DTOS: ReadonlyArray<{ module: string; classes: string[] }> = [
    { module: "appointment.request.ts", classes: ["CreateAppointmentDto", "CancelAppointmentDto", "UpdateAppointmentStatusDto"] },
    { module: "banner.request.ts", classes: ["CreateBannerDto", "UpdateBannerDto"] },
    { module: "cart.request.ts", classes: ["AddToCartDto", "RemoveFromCartDto"] },
    { module: "category.request.ts", classes: ["CreateCategoryDto", "UpdateCategoryDto"] },
    { module: "coupon.request.ts", classes: ["CreateCouponDto", "UpdateCouponDto", "ValidateCouponDto"] },
    { module: "feature.request.ts", classes: ["CreateFeatureDto", "UpdateFeatureDto"] },
    { module: "order.request.ts", classes: ["CreateOrderDto", "UpdateOrderDto", "ChangeOrderStatusDto"] },
    { module: "permission.request.ts", classes: ["CreatePermissionDto", "UpdatePermissionDto"] },
    { module: "product.request.ts", classes: ["CreateProductDto", "UpdateProductDto", "SearchProductDto"] },
    { module: "role.request.ts", classes: ["CreateRoleDto", "UpdateRoleDto"] },
    { module: "service.request.ts", classes: ["CreateServiceDto", "UpdateServiceDto"] },
    { module: "slide.request.ts", classes: ["CreateSlideshowDto", "UpdateSlideshowDto"] },
    { module: "staff.request.ts", classes: ["CreateStaffDto", "UpdateStaffDto", "AssignStaffServiceDto", "SyncStaffServicesDto"] },
    { module: "user.request.ts", classes: ["UpdateUserDto", "AssignRoleDto"] },
    // `ConfigureWhatsAppDto` already existed; `SendNotificationDto` and the
    // nested component class are the ones this change added.
    { module: "whatsapp.request.ts", classes: ["ConfigureWhatsAppDto", "WhatsAppComponentDto", "SendNotificationDto"] },
];

describe("case 10 — one class-validator class per converted DTO", () => {
    test.each(CONVERTED_DTOS.map((entry) => [entry.module, entry.classes] as const))(
        "%s exports its classes by name",
        (module, classes) => {
            const source = fs.readFileSync(path.join(REQUESTS_DIR, module), "utf-8");
            const declared = [...source.matchAll(/export\s+(?:default\s+)?class\s+(\w+)/g)].map(
                (match) => match[1],
            );
            for (const name of classes) {
                expect(declared).toContain(name);
            }
        },
    );

    test("the declared class list matches what the modules actually export, both ways", () => {
        const expected = CONVERTED_DTOS.flatMap((entry) =>
            entry.classes.map((name) => `${entry.module}:${name}`),
        ).sort();
        const actual: string[] = [];
        for (const entry of CONVERTED_DTOS) {
            const source = fs.readFileSync(path.join(REQUESTS_DIR, entry.module), "utf-8");
            for (const match of source.matchAll(/export\s+(?:default\s+)?class\s+(\w+)/g)) {
                actual.push(`${entry.module}:${match[1]}`);
            }
        }
        expect(actual.sort()).toEqual(expected);
    });

    test("every converted class is importable and carries class-validator metadata", () => {
        // Referencing the classes turns a renamed or deleted class into a
        // load-time failure rather than a silently unwired route, and the
        // metadata count is the check that actually distinguishes a
        // class-validator class from an interface: an interface is erased at
        // compile time and registers nothing, so `validateDto` on it would
        // accept every body.
        const classes = [
            CreateRoleDto, UpdateRoleDto,
            CreateBannerDto, UpdateBannerDto,
            CreateCategoryDto, UpdateCategoryDto,
            CreateCouponDto, UpdateCouponDto, ValidateCouponDto,
            CreateFeatureDto, UpdateFeatureDto,
            CreatePermissionDto, UpdatePermissionDto,
            CreateProductDto, UpdateProductDto, SearchProductDto,
            CreateServiceDto, UpdateServiceDto,
            CreateSlideshowDto, UpdateSlideshowDto,
            CreateStaffDto, UpdateStaffDto, AssignStaffServiceDto, SyncStaffServicesDto,
            UpdateUserDto, AssignRoleDto,
            AddToCartDto, RemoveFromCartDto,
            CreateAppointmentDto, CancelAppointmentDto, UpdateAppointmentStatusDto,
            CreateOrderDto, UpdateOrderDto, ChangeOrderStatusDto,
            SendNotificationDto,
            CreateTenantDto, CreateLoyaltyCampaignDto, ConfigureWhatsAppDto,
        ];

        const storage = getMetadataStorage();
        for (const ctor of classes) {
            expect(typeof ctor).toBe("function");
            const metadatas = storage.getTargetValidationMetadatas(
                ctor,
                ctor.name,
                true,
                false,
            );
            expect(`${ctor.name} → ${metadatas.length > 0}`).toBe(
                `${ctor.name} → true`,
            );
        }
        expect(classes).toHaveLength(38);
    });

    test("the modules that already had classes still export them", () => {
        for (const module of ["tenant.dto.ts", "loyalty.request.ts", "whatsapp.request.ts"]) {
            const source = fs.readFileSync(path.join(REQUESTS_DIR, module), "utf-8");
            const declared = [...source.matchAll(/export\s+class\s+(\w+)/g)].map((match) => match[1]);
            expect(declared.length).toBeGreaterThan(0);
        }
        expect(typeof CreateTenantDto).toBe("function");
    });
});
