import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

interface SwaggerProbe {
    count: number;
    health: boolean;
    ready: boolean;
    apis: string[];
}

describe("Swagger configuration", () => {
    let probe: SwaggerProbe;

    // One child process for both assertions: each `tsx` bootstrap rescans the
    // whole route tree, so spawning twice doubled the cost of this suite.
    beforeAll(() => {
        const script = `
            import { swaggerSpec, swaggerApis } from "./infrastructure/config/swagger.config.ts";
            const paths = swaggerSpec.paths || {};
            console.log("__RESULT__" + JSON.stringify({
                count: Object.keys(paths).length,
                health: Boolean(paths["/health"]),
                ready: Boolean(paths["/ready"]),
                apis: swaggerApis,
            }));
        `;
        const output = execFileSync(
            process.execPath,
            ["--import", "tsx", "-e", script],
            { cwd: ROOT, encoding: "utf8" },
        );
        const match = output.match(/__RESULT__(.*)$/m);
        expect(match).not.toBeNull();
        probe = JSON.parse(match?.[1] ?? "{}") as SwaggerProbe;
    });

    it("scans source TypeScript routes and documents the public health paths", () => {
        expect(probe.count).toBeGreaterThan(0);
        expect(probe.health).toBe(true);
        expect(probe.ready).toBe(true);
    });

    it("uses the matching extension for the runtime", () => {
        expect(JSON.stringify(probe.apis)).toContain("routes/*.ts");
    });
});
