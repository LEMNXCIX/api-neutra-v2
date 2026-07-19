import {
    isProduction,
    isDevelopment,
    isTest,
    normalizeEnv,
    ENV_CONSTANTS,
    ROLE_CONSTANTS,
    TENANT_CONSTANTS,
} from "@/core/domain/constants";

describe("Environment helpers (Clean Architecture domain constants)", () => {
    test("normalizeEnv trims and lowercases", () => {
        expect(normalizeEnv("  PROD ")).toBe("prod");
        expect(normalizeEnv(undefined)).toBe("");
    });

    test("isProduction accepts production and prod", () => {
        expect(isProduction("production")).toBe(true);
        expect(isProduction("prod")).toBe(true);
        expect(isProduction("PRODUCTION")).toBe(true);
        expect(isProduction("development")).toBe(false);
        expect(isProduction("dev")).toBe(false);
    });

    test("isDevelopment accepts development and dev", () => {
        expect(isDevelopment("development")).toBe(true);
        expect(isDevelopment("dev")).toBe(true);
        expect(isDevelopment("production")).toBe(false);
        expect(isDevelopment("prod")).toBe(false);
    });

    test("isTest detects test env", () => {
        expect(isTest("test")).toBe(true);
        expect(isTest(ENV_CONSTANTS.TEST)).toBe(true);
        expect(isTest("production")).toBe(false);
    });

    test("RBAC / tenant constants are stable", () => {
        expect(ROLE_CONSTANTS.SUPER_ADMIN).toBe("SUPER_ADMIN");
        expect(TENANT_CONSTANTS.SUPERADMIN_SLUG).toBe("superadmin");
    });
});
