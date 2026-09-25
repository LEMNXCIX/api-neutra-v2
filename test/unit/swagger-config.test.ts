import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

describe("Swagger configuration", () => {
    it("scans source TypeScript routes and documents the public health paths", () => {
        const script = `
            import { swaggerSpec } from "./infrastructure/config/swagger.config.ts";
            const paths = swaggerSpec.paths || {};
            console.log("__RESULT__" + JSON.stringify({
                count: Object.keys(paths).length,
                health: Boolean(paths["/health"]),
                ready: Boolean(paths["/ready"]),
            }));
        `;
        const output = execFileSync(
            process.execPath,
            ["--import", "tsx", "-e", script],
            { cwd: ROOT, encoding: "utf8" },
        );
        const match = output.match(/__RESULT__(.*)$/m);

        expect(match).not.toBeNull();
        const result = JSON.parse(match?.[1] ?? "{}") as {
            count: number;
            health: boolean;
            ready: boolean;
        };
        expect(result.count).toBeGreaterThan(0);
        expect(result.health).toBe(true);
        expect(result.ready).toBe(true);
    });

    it("uses the matching extension for the runtime", () => {
        const script = `
            import { swaggerApis } from "./infrastructure/config/swagger.config.ts";
            console.log("__APIS__" + JSON.stringify(swaggerApis));
        `;
        const output = execFileSync(
            process.execPath,
            ["--import", "tsx", "-e", script],
            { cwd: ROOT, encoding: "utf8" },
        );
        const match = output.match(/__APIS__(.*)$/m);

        expect(match).not.toBeNull();
        expect(match?.[1]).toContain("routes/*.ts");
    });
});
