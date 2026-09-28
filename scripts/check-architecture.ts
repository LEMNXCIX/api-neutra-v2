#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const FORBIDDEN_IMPORTS = [
    {
        pattern: /from\s+['"]@\/config\/db\.config['"]/,
        name: "@/config/db.config",
    },
    { pattern: /from\s+['"]@prisma\/client['"]/, name: "@prisma/client" },
    {
        pattern: /from\s+['"]@\/infrastructure\/database\//,
        name: "@/infrastructure/database/",
    },
];

/** Core must not import outer delivery/infra layers */
const CORE_FORBIDDEN_IMPORTS = [
    {
        pattern: /from\s+['"]@\/infrastructure\//,
        name: "@/infrastructure/*",
    },
    {
        pattern: /from\s+['"]@\/middleware\//,
        name: "@/middleware/*",
    },
    {
        pattern: /from\s+['"]@\/interface-adapters\//,
        name: "@/interface-adapters/*",
    },
    {
        pattern: /from\s+['"]@\/helpers\//,
        name: "@/helpers/*",
    },
    {
        pattern: /from\s+['"]express['"]/,
        name: "express",
    },
    {
        pattern: /from\s+['"]@prisma\/client['"]/,
        name: "@prisma/client",
    },
];

const PROTECTED_DIRS = [
    { dir: "core/domain", label: "core/domain" },
    { dir: "core/application", label: "core/application" },
    { dir: "core/entities", label: "core/entities" },
    { dir: "core/repositories", label: "core/repositories" },
    { dir: "core/ports", label: "core/ports" },
    { dir: "core/providers", label: "core/providers" },
    { dir: "core/services", label: "core/services" },
    { dir: "core/utils", label: "core/utils" },
    { dir: "interface-adapters", label: "interface-adapters" },
    { dir: "middleware", label: "middleware" },
];

const CORE_DIRS = [
    "core/domain",
    "core/application",
    "core/entities",
    "core/repositories",
    "core/ports",
    "core/providers",
    "core/services",
    "core/utils",
];

// Tooling state directories that can contain .ts files and must never be
// inspected. `.git/gentle-ai/candidate-views/` holds frozen review snapshots of
// this repository, so walking it reports hundreds of violations inside a tree
// nobody wrote; `.codegraph/` is generated index output. The repo-root walk
// reaches both, so the skip has to live here rather than in the per-check
// callers.
const IGNORED_DIRECTORIES = new Set([
    "node_modules",
    "dist",
    ".git",
    ".codegraph",
]);

function getAllTsFiles(dir: string): string[] {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        if (entry.isDirectory()) {
            results.push(...getAllTsFiles(fullPath));
        } else if (
            entry.name.endsWith(".ts") &&
            !entry.name.endsWith(".d.ts")
        ) {
            results.push(fullPath);
        }
    }
    return results;
}

let violations = 0;
const warnings = 0;

console.log("=== Architecture Boundary Check ===\n");

for (const { dir, label } of PROTECTED_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) {
        console.log(`SKIP: ${label} directory not found`);
        continue;
    }

    const files = getAllTsFiles(fullPath);

    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");

        for (const { pattern, name } of FORBIDDEN_IMPORTS) {
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
                if (pattern.test(lines[i])) {
                    console.log(
                        `VIOLATION: ${relativePath}:${i + 1} imports ${name}`,
                    );
                    violations++;
                }
            }
        }
    }
}

// Core layer must not depend on outer layers / frameworks
console.log("\n--- Core Layer Dependency Check ---\n");

for (const dir of CORE_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) continue;

    const files = getAllTsFiles(fullPath);
    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
            for (const { pattern, name } of CORE_FORBIDDEN_IMPORTS) {
                if (pattern.test(lines[i])) {
                    console.log(
                        `VIOLATION: ${relativePath}:${i + 1} imports ${name} (core must stay framework-free)`,
                    );
                    violations++;
                }
            }
            if (
                /\bprocess\.env\b/.test(lines[i]) &&
                !/^\s*\/\//.test(lines[i])
            ) {
                console.log(
                    `VIOLATION: ${relativePath}:${i + 1} uses process.env (use IConfigProvider / inject config)`,
                );
                violations++;
            }
        }
    }
}

// Controllers should not import Prisma or Container
console.log("\n--- Controller Boundary Check ---\n");

const controllersDir = path.join(ROOT, "interface-adapters/controllers");
if (fs.existsSync(controllersDir)) {
    for (const file of getAllTsFiles(controllersDir)) {
        const content = fs.readFileSync(file, "utf-8");
        const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
            if (
                /from\s+['"]@prisma\/client['"]/.test(lines[i]) ||
                /from\s+['"]@\/infrastructure\/database\//.test(lines[i]) ||
                /from\s+['"]@\/infrastructure\/config\/container['"]/.test(
                    lines[i],
                )
            ) {
                console.log(
                    `VIOLATION: ${relativePath}:${i + 1} controller couples to persistence/container`,
                );
                violations++;
            }
        }
    }
}

// Check for `as any` and `: any` usage across the whole shipped surface.
//
// This used to run only over PROTECTED_DIRS (core, interface-adapters,
// middleware) and only ever warned, so it saw 14 of the 54 sites that
// existed and none of the 21 in infrastructure/providers. It now scans
// every file the build emits, and a finding fails the run.
console.log(
    "\n--- Type Safety Check: `as any` and `: any` in shipped code ---\n",
);

const ANY_PATTERNS = [
    { pattern: /\bas\s+any\b/, label: "'as any'" },
    { pattern: /:\s*any\b/, label: "': any'" },
    { pattern: /catch\s*\(\s*[\w$]+\s*:\s*any\b/, label: "'catch (e: any)'" },
];

// Mirrors tsconfig.build.json's exclude, plus this script, which necessarily
// spells the patterns it searches for. types/ics.d.ts is an ambient
// declaration for a third-party library and is not ours to restyle.
const ANY_SCAN_EXCLUDE = [
    "test",
    "scripts",
    "node_modules",
    "dist",
    "prisma/seed.ts",
    "types/ics.d.ts",
];

const anyScannable = getAllTsFiles(ROOT)
    .map((file) => path.relative(ROOT, file).replace(/\\/g, "/"))
    .filter(
        (relativePath) =>
            relativePath !== "scripts/check-architecture.ts" &&
            !ANY_SCAN_EXCLUDE.some(
                (excluded) =>
                    relativePath === excluded ||
                    relativePath.startsWith(`${excluded}/`),
            ),
    );

for (const relativePath of anyScannable) {
    const lines = fs
        .readFileSync(path.join(ROOT, relativePath), "utf-8")
        .split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Same rule as scripts/verify-production-build.ts and the doctor's
        // architecture rules: a line carrying no code cannot contain a real
        // `any`. Deliberately not extracted into a shared module — this file
        // runs under node's type stripping while the other two run under tsx,
        // and a cross-tooling import is not worth the coupling for one
        // predicate.
        const trimmed = line.trimStart();
        if (
            trimmed.startsWith("//") ||
            trimmed.startsWith("/*") ||
            trimmed.startsWith("*")
        ) {
            continue;
        }

        for (const { pattern, label: patternLabel } of ANY_PATTERNS) {
            if (pattern.test(line)) {
                console.log(
                    `VIOLATION: ${relativePath}:${i + 1} uses ${patternLabel} in shipped code`,
                );
                violations++;
            }
        }
    }
}

// Check for direct repository instantiation outside runtime composition
console.log("\n--- Instantiation Check: new Prisma* outside runtime.ts ---\n");

const runtimePath = path.join(ROOT, "infrastructure/config/runtime.ts");
const scriptsPath = path.join(ROOT, "scripts");
const testPath = path.join(ROOT, "test");
// Tests intentionally exercise concrete Prisma adapters; this check enforces
// production composition boundaries, not test doubles/fixtures.
const allTsFiles = getAllTsFiles(ROOT).filter(
    (f: string) =>
        f !== runtimePath &&
        !f.startsWith(scriptsPath) &&
        !f.startsWith(testPath),
);

for (const file of allTsFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        if (/new\s+Prisma\w+Repository\s*\(/.test(lines[i])) {
            console.log(
                `VIOLATION: ${relativePath}:${i + 1} instantiates Prisma repository outside runtime.ts`,
            );
            violations++;
        }
    }
}

// Check for direct prisma usage outside the explicit composition boundary
console.log(
    "\n--- Direct Prisma Access Check: prisma.* outside runtime/database ---\n",
);

const allowedPrismaDirs = [
    runtimePath,
    path.join(ROOT, "infrastructure/database"),
    path.join(ROOT, "infrastructure/providers"),
    path.join(ROOT, "infrastructure/services"),
    path.join(ROOT, "scripts"),
    path.join(ROOT, "prisma"),
];

for (const file of allTsFiles) {
    const isAllowed = allowedPrismaDirs.some((d) => file.startsWith(d));
    if (isAllowed) continue;

    const content = fs.readFileSync(file, "utf-8");
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        if (
            /prisma\.\w+\.\w+/.test(lines[i]) &&
            !/\/\/.*prisma/.test(lines[i])
        ) {
            console.log(
                `VIOLATION: ${relativePath}:${i + 1} uses direct prisma access — use runtime/Repository instead`,
            );
            violations++;
        }
    }
}

// HTTP controller composition must remain a wiring-only layer.
console.log("\n--- HTTP Controller Composition Check ---\n");

const httpCompositionDirectory = path.join(
    ROOT,
    "infrastructure/config/http-controllers",
);
const httpCompositionFiles = [
    path.join(ROOT, "infrastructure/config/http-controllers.ts"),
    ...(fs.existsSync(httpCompositionDirectory)
        ? getAllTsFiles(httpCompositionDirectory)
        : []),
];
const httpCompositionPatterns = [
    { pattern: /from\s+['"][^'"]*express['"]/i, name: "Express import" },
    {
        pattern: /\b(?:Request|Response|Router|Express)\b/,
        name: "Express symbol",
    },
    {
        pattern:
            /@prisma|config\/db\.config|infrastructure\/database|\bprisma\s*\./i,
        name: "direct Prisma access",
    },
    {
        pattern: /infrastructure\/config\/container|\bContainer\b/,
        name: "Container reference",
    },
    {
        pattern:
            /infrastructure\/routes|\bapp\.(?:get|post|put|delete|patch)\b|\brouter\./i,
        name: "HTTP route registration",
    },
    {
        pattern: /@\/core\/(?:entities|domain)\//i,
        name: "core entity/domain import",
    },
    {
        pattern: /\b(?:if|switch|for|while|try|catch|throw)\b/i,
        name: "business control flow",
    },
];

function stripComments(content: string): string {
    return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

for (const file of httpCompositionFiles) {
    const content = stripComments(fs.readFileSync(file, "utf-8"));
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        for (const { pattern, name } of httpCompositionPatterns) {
            if (pattern.test(lines[i])) {
                console.log(
                    `VIOLATION: ${relativePath}:${i + 1} HTTP composition ${name}`,
                );
                violations++;
            }
        }
    }
}

console.log("\n=== Summary ===");
console.log(`Violations: ${violations}`);
console.log(`Warnings (as any): ${warnings}`);

if (violations > 0) {
    console.log("\nFAILED: Architecture boundary violations detected.");
    process.exit(1);
} else {
    console.log("\nPASSED: No architecture boundary violations.");
    process.exit(0);
}
