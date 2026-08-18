import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../..");

function getAllTsFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        if (entry.isDirectory()) results.push(...getAllTsFiles(full));
        else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
            results.push(full);
        }
    }
    return results;
}

describe("Clean Architecture boundaries", () => {
    const coreDirs = [
        "core/domain",
        "core/application",
        "core/entities",
        "core/repositories",
        "core/ports",
        "core/providers",
        "core/services",
        "core/presenters",
        "core/utils",
    ];

    const forbiddenInCore = [
        /from\s+['"]@\/infrastructure\//,
        /from\s+['"]@\/middleware\//,
        /from\s+['"]@\/interface-adapters\//,
        /from\s+['"]@\/helpers\//,
        /from\s+['"]express['"]/,
        /from\s+['"]@prisma\/client['"]/,
    ];

    test("core layer does not import outer layers or express/prisma", () => {
        const violations: string[] = [];

        for (const dir of coreDirs) {
            for (const file of getAllTsFiles(path.join(ROOT, dir))) {
                const rel = path.relative(ROOT, file).replace(/\\/g, "/");
                const lines = fs.readFileSync(file, "utf-8").split("\n");
                lines.forEach((line, idx) => {
                    for (const pattern of forbiddenInCore) {
                        if (pattern.test(line)) {
                            violations.push(`${rel}:${idx + 1} → ${line.trim()}`);
                        }
                    }
                    if (
                        /\bprocess\.env\b/.test(line) &&
                        !/^\s*\/\//.test(line)
                    ) {
                        violations.push(
                            `${rel}:${idx + 1} process.env → ${line.trim()}`,
                        );
                    }
                });
            }
        }

        expect(violations).toEqual([]);
    });

    test("controllers do not import Container or Prisma", () => {
        const violations: string[] = [];
        const controllersDir = path.join(
            ROOT,
            "interface-adapters/controllers",
        );

        for (const file of getAllTsFiles(controllersDir)) {
            const rel = path.relative(ROOT, file).replace(/\\/g, "/");
            const lines = fs.readFileSync(file, "utf-8").split("\n");
            lines.forEach((line, idx) => {
                if (
                    /from\s+['"]@prisma\/client['"]/.test(line) ||
                    /from\s+['"]@\/infrastructure\/database\//.test(line) ||
                    /from\s+['"]@\/infrastructure\/config\/container['"]/.test(
                        line,
                    )
                ) {
                    violations.push(`${rel}:${idx + 1} → ${line.trim()}`);
                }
            });
        }

        expect(violations).toEqual([]);
    });
});
