import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

function filesIn(directory: string): string[] {
    if (!fs.existsSync(directory)) return [];
    return fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) return filesIn(fullPath);
            return entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")
                ? [fullPath]
                : [];
        });
}

function importedModule(line: string): string | null {
    const match = line.match(
        /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/,
    );
    return match?.[1] ?? null;
}

function forbiddenReason(moduleName: string): string | null {
    if (/node:/i.test(moduleName)) return "node: import";
    if (/(^|\/)fs(\/|$)/i.test(moduleName)) return "fs import";
    if (/(^|\/)child_process(\/|$)/i.test(moduleName)) {
        return "child_process import";
    }
    if (/(^|\/)process(\/|$)/i.test(moduleName)) return "process import";
    if (/(^|\/)express(\/|$)/i.test(moduleName)) return "express import";
    if (/@prisma/i.test(moduleName)) return "Prisma import";
    if (/infrastructure/i.test(moduleName)) return "infrastructure import";
    if (/middleware/i.test(moduleName)) return "middleware import";
    if (/(^|\/)app(?:\.[^/]+)?$/i.test(moduleName)) return "app import";
    if (/Container/.test(moduleName)) return "Container import";
    return null;
}

describe("api-doctor domain/application boundaries", () => {
    test("keeps core doctor layers free of runtime and application dependencies", () => {
        const violations: string[] = [];
        const directories = [
            path.join(ROOT, "scripts/api-doctor/domain"),
            path.join(ROOT, "scripts/api-doctor/application"),
        ];

        for (const directory of directories) {
            for (const file of filesIn(directory)) {
                const relative = path.relative(ROOT, file).replace(/\\/g, "/");
                const lines = fs.readFileSync(file, "utf8").split("\n");
                lines.forEach((line, index) => {
                    const moduleName = importedModule(line);
                    if (!moduleName) return;
                    const reason = forbiddenReason(moduleName);
                    if (reason) {
                        violations.push(`${relative}:${index + 1} ${reason}`);
                    }
                    if (/\bprocess\s*\./.test(line)) {
                        violations.push(
                            `${relative}:${index + 1} process usage`,
                        );
                    }
                });
            }
        }

        expect(violations).toEqual([]);
    });
});
