import {
    isOriginAllowed,
    parseOriginsList,
    buildStaticAllowlist,
} from "@/middleware/cors.middleware";
import { CORS_CONSTANTS } from "@/config/infrastructure-constants";

describe("CORS policy (delivery layer)", () => {
    describe("parseOriginsList", () => {
        test("splits and trims comma-separated origins", () => {
            expect(
                parseOriginsList(" https://a.com , https://b.com, "),
            ).toEqual(["https://a.com", "https://b.com"]);
        });

        test("handles array input", () => {
            expect(parseOriginsList(["https://a.com", "  "])).toEqual([
                "https://a.com",
            ]);
        });
    });

    describe("buildStaticAllowlist", () => {
        test("uses DEFAULT_PRODUCTION_ORIGINS when prod and empty config", () => {
            const set = buildStaticAllowlist({
                isProduction: true,
                allowedOrigins: "",
            });
            for (const origin of CORS_CONSTANTS.DEFAULT_PRODUCTION_ORIGINS) {
                expect(set.has(origin)).toBe(true);
            }
        });

        test("env origins replace production defaults", () => {
            const set = buildStaticAllowlist({
                isProduction: true,
                allowedOrigins: "https://staging.example.com",
            });
            expect(set.has("https://staging.example.com")).toBe(true);
            expect(set.has(CORS_CONSTANTS.DEFAULT_PRODUCTION_ORIGINS[0])).toBe(
                false,
            );
        });
    });

    describe("isOriginAllowed", () => {
        const prod = {
            isProduction: true,
            allowedOrigins: "",
        };
        const dev = {
            isProduction: false,
            allowedOrigins: "",
        };

        test("production: allows default neutra origins", () => {
            expect(isOriginAllowed("https://neutra.ec", prod)).toBe(true);
            expect(isOriginAllowed("https://admin.neutra.ec", prod)).toBe(true);
        });

        test("production: blocks unknown and missing origin", () => {
            expect(isOriginAllowed("https://evil.com", prod)).toBe(false);
            expect(isOriginAllowed(undefined, prod)).toBe(false);
        });

        test("development: allows localhost variants and LAN", () => {
            expect(isOriginAllowed("http://localhost:3000", dev)).toBe(true);
            expect(
                isOriginAllowed("http://superadmin.localhost:5173", dev),
            ).toBe(true);
            expect(isOriginAllowed("http://127.0.0.1:5500", dev)).toBe(true);
            expect(isOriginAllowed("http://192.168.1.20:3000", dev)).toBe(true);
            expect(isOriginAllowed(undefined, dev)).toBe(true);
        });

        test("development: blocks public internet origins", () => {
            expect(isOriginAllowed("https://evil.com", dev)).toBe(false);
        });

        test("allowedOrigins works in production", () => {
            expect(
                isOriginAllowed("https://preview.app", {
                    isProduction: true,
                    allowedOrigins: "https://preview.app",
                }),
            ).toBe(true);
        });
    });
});
