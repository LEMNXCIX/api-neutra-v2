#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

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
    { dir: "core/presenters", label: "core/presenters" },
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
    "core/presenters",
    "core/utils",
];

function getAllTsFiles(dir: string): string[] {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === "node_modules" || entry.name === "dist") continue;
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
let warnings = 0;

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
            if (/\bprocess\.env\b/.test(lines[i]) && !/^\s*\/\//.test(lines[i])) {
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

// Check for `as any` and `: any` usage in protected dirs
console.log(
    "\n--- Type Safety Check: `as any` and `: any` in protected directories ---\n",
);

const ANY_PATTERNS = [
    { pattern: /\bas\s+any\b/, label: "'as any'" },
    { pattern: /:\s*any\b/, label: "': any'" },
];

for (const { dir, label: dirLabel } of PROTECTED_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) continue;

    const files = getAllTsFiles(fullPath);

    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;

            for (const { pattern, label: patternLabel } of ANY_PATTERNS) {
                if (pattern.test(line)) {
                    console.log(
                        `WARNING: ${relativePath}:${i + 1} uses ${patternLabel}`,
                    );
                    warnings++;
                }
            }
        }
    }
}

// Check for direct repository instantiation outside container
console.log(
    "\n--- Instantiation Check: new Prisma* outside container.ts ---\n",
);

const containerPath = path.join(ROOT, "infrastructure/config/container.ts");
const scriptsPath = path.join(ROOT, "scripts");
const allTsFiles = getAllTsFiles(ROOT).filter(
    (f: string) => f !== containerPath && !f.startsWith(scriptsPath),
);

for (const file of allTsFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        if (/new\s+Prisma\w+Repository\s*\(/.test(lines[i])) {
            console.log(
                `VIOLATION: ${relativePath}:${i + 1} instantiates Prisma repository outside Container`,
            );
            violations++;
        }
    }
}

// Check for direct prisma usage outside infrastructure/database and container
console.log(
    "\n--- Direct Prisma Access Check: prisma.* outside infrastructure/database/ ---\n",
);

const allowedPrismaDirs = [
    path.join(ROOT, "infrastructure/database"),
    path.join(ROOT, "infrastructure/config"),
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
                `VIOLATION: ${relativePath}:${i + 1} uses direct prisma access — use Container/Repository instead`,
            );
            violations++;
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
