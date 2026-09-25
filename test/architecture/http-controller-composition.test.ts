import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const COMPOSITION_DIRECTORY = path.join(
    ROOT,
    "infrastructure/config/http-controllers",
);
const CONTEXT_FILES = [
    "identity.controllers.ts",
    "catalog.controllers.ts",
    "commerce.controllers.ts",
    "booking.controllers.ts",
    "messaging.controllers.ts",
    "operations.controllers.ts",
];
const EXPECTED_KEYS = [
    "auth",
    "user",
    "tenant",
    "role",
    "permission",
    "feature",
    "product",
    "category",
    "banner",
    "coupon",
    "slide",
    "order",
    "cart",
    "loyalty",
    "appointment",
    "staff",
    "service",
    "whatsappWebhook",
    "whatsappConfig",
    "whatsapp",
    "health",
    "log",
];
const FORBIDDEN_PATTERNS = [
    /from\s+['"][^'"]*express['"]/i,
    /\b(?:Request|Response|Router|Express)\b/,
    /@prisma|config\/db\.config|infrastructure\/database|\bprisma\s*\./i,
    /infrastructure\/config\/container|\bContainer\b/,
    /infrastructure\/routes|\bapp\.(?:get|post|put|delete|patch)\b|\brouter\./i,
    /@\/core\/(?:entities|domain)\//i,
    /\b(?:if|switch|for|while|try|catch|throw)\b/i,
];

function stripComments(content: string): string {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
}

function readSource(relativePath: string): string {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function returnedControllerKeys(source: string): string[] {
    const lines = stripComments(source).split("\n");
    const returnIndex = lines.findIndex((line) =>
        /^\s{4}return\s*\{\s*$/.test(line),
    );
    if (returnIndex < 0) return [];

    const keys: string[] = [];
    let depth = 1;
    for (const line of lines.slice(returnIndex + 1)) {
        const match = line.match(
            /^(\s*)([A-Za-z][A-Za-z0-9]*):\s+new\s+[A-Za-z0-9]*Controller\s*\(/,
        );
        if (match && depth === 1) keys.push(match[2]);

        for (const character of line) {
            if (character === "{") depth += 1;
            if (character === "}") depth -= 1;
        }
        if (depth === 0) break;
    }
    return keys;
}

describe("HTTP controller composition boundaries", () => {
    test("index exposes the merged controller factory", () => {
        const index = readSource(
            "infrastructure/config/http-controllers/index.ts",
        );

        expect(index).toContain("export function createHttpControllers");
        expect(index).toContain("export type HttpControllers");
    });

    test("the directory contains exactly the six context factories", () => {
        const files = fs
            .readdirSync(COMPOSITION_DIRECTORY)
            .filter((file) => file.endsWith(".controllers.ts"))
            .sort();
        const expected = [...CONTEXT_FILES].sort();

        expect(files).toEqual(expected);
        for (const file of CONTEXT_FILES) {
            expect(fs.existsSync(path.join(COMPOSITION_DIRECTORY, file))).toBe(
                true,
            );
        }
    });

    test("context factories expose exactly the expected controller keys", () => {
        const keys = CONTEXT_FILES.flatMap((file) =>
            returnedControllerKeys(
                readSource(`infrastructure/config/http-controllers/${file}`),
            ),
        );

        expect(keys).toHaveLength(22);
        expect(new Set(keys).size).toBe(22);
        expect([...keys].sort()).toEqual([...EXPECTED_KEYS].sort());
    });

    test("the shim and context files contain only wiring code", () => {
        const files = [
            "infrastructure/config/http-controllers.ts",
            "infrastructure/config/http-controllers/index.ts",
            ...CONTEXT_FILES.map(
                (file) => `infrastructure/config/http-controllers/${file}`,
            ),
        ];

        for (const file of files) {
            const source = stripComments(readSource(file));
            for (const pattern of FORBIDDEN_PATTERNS) {
                expect(source).not.toMatch(pattern);
            }
        }
    });
});
