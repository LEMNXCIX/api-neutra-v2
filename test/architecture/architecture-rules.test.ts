import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createArchitectureRulesCheck } from "../../scripts/api-doctor/adapters/architecture.adapter";
import type {
    CheckRunResult,
    DoctorContext,
} from "../../scripts/api-doctor/domain/check-result";

const REPO_ROOT = resolve(__dirname, "../..");
const check = createArchitectureRulesCheck(
    ["default", "ci", "full"],
    ["ci", "full"],
);

function contextFor(rootDir: string): DoctorContext {
    return {
        rootDir,
        profile: "ci",
        includeIntegration: false,
        hasEnvKey: () => false,
    };
}

function detailsFor(result: CheckRunResult, rule: string): string[] {
    return (result.details ?? []).filter((detail) =>
        detail.startsWith(`${rule} `),
    );
}

describe("architecture.rules", () => {
    let sandbox: string;

    beforeEach(() => {
        sandbox = mkdtempSync(join(tmpdir(), "architecture-rules-"));
    });

    afterEach(() => {
        rmSync(sandbox, { recursive: true, force: true });
    });

    function write(relativePath: string, content: string): void {
        const absolute = join(sandbox, relativePath);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, content, "utf8");
    }

    async function runIn(rootDir: string): Promise<CheckRunResult> {
        return check.run(contextFor(rootDir));
    }

    test("every rule holds against the real repository", async () => {
        const result = await runIn(REPO_ROOT);
        const details = result.details ?? [];

        // Ratchet: the repository is not yet clean, but the reported set of
        // violations must be exactly the known debt and no more. Each entry
        // below is cleared by its own work unit; when the list is empty the
        // assertion becomes a plain PASS, which is the state the ci profile
        // gate requires. Never add an entry here to silence a new finding.
        const knownDebt: Array<{ rule: string; subject: RegExp; clearedBy: string }> = [];

        // No violation may fall outside the known set. Asserting the empty
        // array keeps the offending detail in the jest diff.
        const unratcheted = details.filter(
            (detail) =>
                !knownDebt.some(
                    (candidate) =>
                        detail.startsWith(candidate.rule) &&
                        candidate.subject.test(detail),
                ),
        );
        expect(unratcheted).toEqual([]);

        // Every known entry must still be reported, so clearing one really
        // cleared it instead of the rule silently ceasing to detect it.
        const missing = knownDebt
            .filter(
                (entry) =>
                    !details.some(
                        (detail) =>
                            detail.startsWith(entry.rule) &&
                            entry.subject.test(detail),
                    ),
            )
            .map((entry) => `${entry.clearedBy} was expected to clear ${entry.rule}`);
        expect(missing).toEqual([]);

        // R1, R3, R6 and R7 must be clean right now and must never regress.
        for (const rule of ["R1", "R3", "R6", "R7"]) {
            expect(details.filter((detail) => detail.startsWith(rule))).toEqual([]);
        }
    });

    test("R1 rejects a core/ import of infrastructure through the @/ alias", async () => {
        write(
            "core/application/order/create-order.use-case.ts",
            'import { prisma } from "@/infrastructure/database/prisma/client";\n',
        );

        const result = await runIn(sandbox);

        expect(result.status).toBe("FAIL");
        expect(detailsFor(result, "R1")).toEqual([
            'R1 core/application/order/create-order.use-case.ts:1 static import "@/infrastructure/database/prisma/client" reaches forbidden layer "infrastructure"',
        ]);
    });

    test("R1 resolves a relative specifier out of core/ (the gap check:arch misses)", async () => {
        write(
            "core/application/order/create-order.use-case.ts",
            'import { prisma } from "../../../infrastructure/database/prisma/client";\n',
        );

        const result = await runIn(sandbox);

        expect(result.status).toBe("FAIL");
        expect(detailsFor(result, "R1")).toEqual([
            'R1 core/application/order/create-order.use-case.ts:1 static import "../../../infrastructure/database/prisma/client" reaches forbidden layer "infrastructure"',
        ]);
    });

    test("R1 rejects require() of @prisma/client inside core/", async () => {
        write(
            "core/entities/coupon.entity.ts",
            'import type { Prisma } from "@prisma/client";\n\nconst prisma = require("@prisma/client");\n',
        );

        const result = await runIn(sandbox);

        expect(result.status).toBe("FAIL");
        expect(detailsFor(result, "R1")).toEqual([
            'R1 core/entities/coupon.entity.ts:1 static import "@prisma/client" reaches forbidden package "@prisma/client"',
            'R1 core/entities/coupon.entity.ts:3 require import "@prisma/client" reaches forbidden package "@prisma/client"',
        ]);
        expect(detailsFor(result, "R7")).toEqual([
            "R7 core/entities/coupon.entity.ts:3 calls require() inside core/",
        ]);
    });

    test("R1 accepts a relative specifier that stays inside core/", async () => {
        write(
            "core/repositories/tenant.repository.interface.ts",
            'import { Tenant } from "../entities/tenant.entity";\n',
        );

        expect(detailsFor(await runIn(sandbox), "R1")).toEqual([]);
    });

    test("R2 rejects an exported function in an entity module", async () => {
        write(
            "core/entities/coupon.entity.ts",
            [
                "export interface Coupon {",
                "    id: string;",
                "}",
                "",
                "export function buildCoupon(id: string): Coupon {",
                "    return { id };",
                "}",
                "",
            ].join("\n"),
        );

        const result = await runIn(sandbox);

        expect(result.status).toBe("FAIL");
        expect(detailsFor(result, "R2")).toEqual([
            "R2 core/entities/coupon.entity.ts:5 exported function in an entity module",
        ]);
    });

    test("R2 allows a bare export const alias in an entity module", async () => {
        write(
            "core/entities/loyalty.entity.ts",
            [
                "export type LoyaltyStatus = \"ACTIVE\" | \"DRAFT\";",
                "",
                "export const LoyaltyCampaignCustomerStatus = LoyaltyStatus;",
                "",
            ].join("\n"),
        );

        expect(detailsFor(await runIn(sandbox), "R2")).toEqual([]);
    });

    test("R4 rejects a business rule code implemented in two layers", async () => {
        write(
            "core/application/order/create-order.use-case.ts",
            [
                "import { BusinessRuleViolationError } from \"@/core/domain/errors/domain-errors\";",
                "",
                "export function requireCoupons(): void {",
                "    throw new BusinessRuleViolationError(",
                "        \"Coupon validation is not available for this tenant\",",
                "        \"COUPONS_FEATURE_REQUIRED\",",
                "    );",
                "}",
                "",
            ].join("\n"),
        );
        write(
            "infrastructure/database/prisma/order.prisma-repository.ts",
            [
                "import { BusinessRuleViolationError } from \"@/core/domain/errors/domain-errors\";",
                "",
                "if (!couponsEnabled) {",
                "    throw new BusinessRuleViolationError(",
                "        \"Coupon validation is not available for this tenant\",",
                "        \"COUPONS_FEATURE_REQUIRED\",",
                "    );",
                "}",
                "",
            ].join("\n"),
        );

        const result = await runIn(sandbox);

        expect(result.status).toBe("FAIL");
        expect(detailsFor(result, "R4")).toEqual([
            "R4 code \"COUPONS_FEATURE_REQUIRED\" is implemented in core (core/application/order/create-order.use-case.ts:4) and in an outer layer (infrastructure/database/prisma/order.prisma-repository.ts:4)",
        ]);
    });

    test("R3 requires a non-empty domain layer", async () => {
        write(
            "core/domain/auth.types.ts",
            "export interface AuthContext {\n    tenantId: string;\n}\n",
        );

        const result = await runIn(sandbox);

        expect(detailsFor(result, "R3")).toEqual([
            "R3 core/domain/ contains no *.policy.ts file",
        ]);

        write("core/domain/coupon/coupon.policy.ts", "export const x = 1;\n");

        expect(detailsFor(await runIn(sandbox), "R3")).toEqual([]);
    });

    test("R5, R6 and R7 flag their own targets", async () => {
        write(
            "core/presenters/role.presenter.ts",
            "export class RolePresenter {}\n",
        );
        write(
            "infrastructure/database/prisma/order.prisma-repository.ts",
            "const row = { discountAmount: 0 };\n",
        );
        write("core/utils/money.ts", 'const lib = require("../helpers/decimal");\n');

        const result = await runIn(sandbox);

        expect(detailsFor(result, "R5")).toEqual([
            "R5 core/presenters/ exists (1 TypeScript files)",
        ]);
        expect(detailsFor(result, "R6")).toEqual([
            "R6 infrastructure/database/prisma/order.prisma-repository.ts:1 hardcodes discountAmount: 0",
        ]);
        expect(detailsFor(result, "R7")).toEqual([
            "R7 core/utils/money.ts:1 calls require() inside core/",
        ]);
    });
});
