import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

describe("runtime and production contracts", () => {
    test("uses the canonical App Engine Node runtime", () => {
        const appYaml = fs.readFileSync(path.join(ROOT, "app.yaml"), "utf8");

        expect(appYaml.trim()).toBe("runtime: nodejs22");
    });

    test("registers public health routes before tenant resolution", () => {
        const appSource = fs.readFileSync(path.join(ROOT, "app.ts"), "utf8");
        const healthIndex = appSource.indexOf("healthRoutes(app");
        const tenantIndex = appSource.indexOf("app.use(tenantMiddleware)");

        expect(healthIndex).toBeGreaterThanOrEqual(0);
        expect(tenantIndex).toBeGreaterThanOrEqual(0);
        expect(healthIndex).toBeLessThan(tenantIndex);
    });

    test("wires the production artifact verification into the build", () => {
        const packageJson = JSON.parse(
            fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
        ) as { scripts?: Record<string, string> };

        expect(packageJson.scripts?.build).toContain(
            "verify-production-build.ts --rewrite",
        );
        expect(packageJson.scripts?.["verify:production"]).toContain(
            "verify-production-build.ts",
        );
    });
});
