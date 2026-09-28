import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix, relative } from "node:path";
import type {
    CheckRunResult,
    DoctorCheck,
    DoctorContext,
    DoctorProfile,
} from "../domain/check-result";

const SKIP_DIRECTORIES: readonly string[] = [
    "node_modules",
    "dist",
    ".git",
    ".codegraph",
];

/** R1: top-level trees core/ may never reach through an alias or relative path. */
const FORBIDDEN_TREES: readonly string[] = [
    "infrastructure",
    "interface-adapters",
    "middleware",
    "helpers",
    "config",
    "app",
];

/** R1: packages that pull a framework or a database driver into the domain. */
const FORBIDDEN_MODULES: readonly string[] = [
    "express",
    "@prisma/client",
    "app",
];

const CORE_PREFIX = "core/";
const DOMAIN_PREFIX = "core/domain/";
const PRESENTERS_PREFIX = "core/presenters/";
const MONEY_PREFIX = "infrastructure/database/";

const DOMAIN_ALLOWED_FILES: readonly string[] = [
    "auth.types.ts",
    "constants.ts",
];
const MONEY_FIELDS: readonly string[] = ["discountAmount", "subtotal", "total"];
const MONEY_ZERO = new RegExp(
    `\\b(?:${MONEY_FIELDS.join("|")})\\b\\s*[:=]\\s*0\\b`,
);
const REQUIRE_CALL = /\brequire\s*\(/;

interface SourceFile {
    /** Repository-relative path with forward slashes. */
    path: string;
    /** Offset of each line, so an index maps back to file:line. */
    lineOffsets: number[];
    lines: string[];
    text: string;
}

type Violation = string;

interface Rule {
    id: string;
    run: (rootDir: string, files: readonly SourceFile[]) => Violation[];
}

function toPosix(value: string): string {
    return value.split("\\").join("/");
}

function listDirectory(directory: string) {
    try {
        return readdirSync(directory, { withFileTypes: true });
    } catch {
        return [];
    }
}

function readSourceFile(
    rootDir: string,
    absolutePath: string,
): SourceFile | null {
    let text: string;
    try {
        text = readFileSync(absolutePath, "utf8");
    } catch {
        return null;
    }
    const lines = text.split("\n");
    const lineOffsets: number[] = [];
    let offset = 0;
    for (const line of lines) {
        lineOffsets.push(offset);
        offset += line.length + 1;
    }
    return {
        path: toPosix(relative(rootDir, absolutePath)),
        lineOffsets,
        lines,
        text,
    };
}

/** Single pass over the tree, reused by every rule. */
function collectSourceFiles(rootDir: string): SourceFile[] {
    const files: SourceFile[] = [];
    const walk = (directory: string): void => {
        const entries = [...listDirectory(directory)].sort((a, b) =>
            a.name.localeCompare(b.name),
        );
        for (const entry of entries) {
            if (SKIP_DIRECTORIES.includes(entry.name)) continue;
            const absolute = join(directory, entry.name);
            if (entry.isDirectory()) {
                walk(absolute);
            } else if (
                entry.name.endsWith(".ts") &&
                !entry.name.endsWith(".d.ts")
            ) {
                const file = readSourceFile(rootDir, absolute);
                if (file) files.push(file);
            }
        }
    };
    walk(rootDir);
    return files;
}

function isCodeLine(line: string): boolean {
    const trimmed = line.trimStart();
    return !(
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*")
    );
}

function inDirectory(file: SourceFile, prefix: string): boolean {
    return file.path.startsWith(prefix);
}

/** Every module specifier on a line, tagged with the mechanism that produced it. */
function moduleSpecifiers(
    line: string,
): Array<{ mechanism: string; specifier: string }> {
    const found: Array<{ mechanism: string; specifier: string }> = [];
    const patterns: ReadonlyArray<[string, RegExp]> = [
        ["static", /from\s*["']([^"']+)["']/g],
        ["static", /^\s*import\s+["']([^"']+)["']/g],
        ["require", /\brequire\s*\(\s*["']([^"']+)["']/g],
        ["dynamic", /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g],
    ];
    for (const [mechanism, pattern] of patterns) {
        for (const match of line.matchAll(pattern)) {
            found.push({ mechanism, specifier: match[1] });
        }
    }
    return found;
}

/** Repository-relative target of an alias or relative specifier, else null. */
function resolveRepoTarget(file: SourceFile, specifier: string): string | null {
    if (specifier.startsWith("@/")) {
        return specifier.slice(2);
    }
    if (!specifier.startsWith(".")) {
        return null;
    }
    const directory = file.path.slice(0, file.path.lastIndexOf("/"));
    return posix
        .normalize(`${directory}/${specifier}`)
        .replace(/^(\.\.\/)+/, "");
}

function forbiddenModule(specifier: string): string | null {
    if (
        FORBIDDEN_MODULES.includes(specifier) ||
        specifier.startsWith("express/")
    ) {
        return `forbidden package "${specifier}"`;
    }
    return null;
}

/** R1: core/ must not import outer layers, frameworks, or Prisma. */
const layerDirection: Rule = {
    id: "R1",
    run: (_rootDir, files) => {
        const violations: Violation[] = [];
        for (const file of files) {
            if (!inDirectory(file, CORE_PREFIX)) continue;
            file.lines.forEach((line, index) => {
                if (!isCodeLine(line)) return;
                for (const { mechanism, specifier } of moduleSpecifiers(line)) {
                    const reason =
                        forbiddenModule(specifier) ??
                        forbiddenLayer(file, specifier);
                    if (reason) {
                        violations.push(
                            `${file.path}:${index + 1} ${mechanism} import "${specifier}" reaches ${reason}`,
                        );
                    }
                }
            });
        }
        return violations;
    },
};

function forbiddenLayer(file: SourceFile, specifier: string): string | null {
    const target = resolveRepoTarget(file, specifier);
    if (target === null) return null;
    const head = target.split("/")[0];
    return FORBIDDEN_TREES.includes(head) ? `forbidden layer "${head}"` : null;
}

const ENTITY_DECLARATIONS: ReadonlyArray<[string, RegExp]> = [
    ["exported function", /^export\s+(?:async\s+)?function\b/],
    ["top-level function", /^(?:async\s+)?function\b/],
    ["exported class", /^export\s+(?:abstract\s+)?class\b/],
];

/** R2: entities carry types only, never behaviour. */
const entitiesAreTypes: Rule = {
    id: "R2",
    run: (_rootDir, files) => {
        const violations: Violation[] = [];
        for (const file of files) {
            if (!inDirectory(file, `${CORE_PREFIX}entities/`)) continue;
            file.lines.forEach((line, index) => {
                if (!isCodeLine(line)) return;
                for (const [label, pattern] of ENTITY_DECLARATIONS) {
                    if (pattern.test(line)) {
                        violations.push(
                            `${file.path}:${index + 1} ${label} in an entity module`,
                        );
                    }
                }
            });
        }
        return violations;
    },
};

/** R3: the domain layer must exist and hold real policies. */
const domainExists: Rule = {
    id: "R3",
    run: (rootDir, files) => {
        const violations: Violation[] = [];
        if (!existsSync(join(rootDir, "core/domain"))) {
            return ["core/domain/ is missing"];
        }
        const domainFiles = files.filter((file) =>
            inDirectory(file, DOMAIN_PREFIX),
        );
        const hasPolicy = domainFiles.some((file) =>
            file.path.endsWith(".policy.ts"),
        );
        if (!hasPolicy) {
            violations.push("core/domain/ contains no *.policy.ts file");
        }
        for (const file of domainFiles) {
            const relativeToDomain = file.path.slice(DOMAIN_PREFIX.length);
            const isDirectChild = !relativeToDomain.includes("/");
            if (!isDirectChild) continue;
            if (
                file.path.endsWith(".policy.ts") ||
                DOMAIN_ALLOWED_FILES.includes(relativeToDomain)
            ) {
                continue;
            }
            violations.push(
                `${file.path} is neither a *.policy.ts, ${DOMAIN_ALLOWED_FILES.join(
                    ", ",
                )}, nor under core/domain/errors/`,
            );
        }
        return violations;
    },
};

function lineAtOffset(file: SourceFile, offset: number): number {
    let line = 1;
    for (let index = 0; index < file.lineOffsets.length; index += 1) {
        if (file.lineOffsets[index] > offset) break;
        line = index + 1;
    }
    return line;
}

function layerOf(filePath: string): "core" | "outer" | "other" {
    const root = filePath.split("/")[0];
    if (root === "core") return "core";
    if (root === "infrastructure" || root === "interface-adapters") {
        return "outer";
    }
    return "other";
}

/**
 * Read the argument list that follows an already-matched call's open paren.
 * ponytail: paren counting ignores parens inside string literals, so a code
 * whose message carries an unbalanced paren is missed. Parse with a real AST
 * if that shape ever shows up.
 */
function readCallArguments(text: string, openIndex: number): string {
    let depth = 1;
    let index = openIndex;
    while (index < text.length && depth > 0) {
        const char = text[index];
        if (char === "(") depth += 1;
        else if (char === ")") depth -= 1;
        index += 1;
    }
    return text.slice(openIndex, index - 1);
}

/** R4: a business rule code may not be implemented in two layers. */
const noDuplicatedRules: Rule = {
    id: "R4",
    run: (_rootDir, files) => {
        const sites = new Map<string, { core: string[]; outer: string[] }>();
        for (const file of files) {
            const pattern = /BusinessRuleViolationError\s*\(/g;
            let match = pattern.exec(file.text);
            while (match !== null) {
                const args = readCallArguments(
                    file.text,
                    match.index + match[0].length,
                );
                const where = `${file.path}:${lineAtOffset(file, match.index)}`;
                for (const literal of args.matchAll(
                    /["'`]([A-Z][A-Z0-9_]{2,})["'`]/g,
                )) {
                    const code = literal[1];
                    const entry = sites.get(code) ?? { core: [], outer: [] };
                    const layer = layerOf(file.path);
                    if (layer === "core") entry.core.push(where);
                    if (layer === "outer") entry.outer.push(where);
                    sites.set(code, entry);
                }
                match = pattern.exec(file.text);
            }
        }

        const violations: Violation[] = [];
        for (const [code, entry] of sites) {
            if (entry.core.length === 0 || entry.outer.length === 0) continue;
            violations.push(
                `code "${code}" is implemented in core (${entry.core.join(
                    ", ",
                )}) and in an outer layer (${entry.outer.join(", ")})`,
            );
        }
        return violations;
    },
};

/** R5: the presenter layer is dead and must stay deleted. */
const noPresenters: Rule = {
    id: "R5",
    run: (rootDir, files) => {
        if (!existsSync(join(rootDir, "core/presenters"))) return [];
        const count = files.filter((file) =>
            inDirectory(file, PRESENTERS_PREFIX),
        ).length;
        return [`core/presenters/ exists (${count} TypeScript files)`];
    },
};

/** R6: money fields are never hardcoded to zero. */
const noHardcodedMoney: Rule = {
    id: "R6",
    run: (_rootDir, files) => {
        const violations: Violation[] = [];
        for (const file of files) {
            if (!inDirectory(file, MONEY_PREFIX)) continue;
            file.lines.forEach((line, index) => {
                if (!isCodeLine(line)) return;
                const match = MONEY_ZERO.exec(line);
                if (match) {
                    violations.push(
                        `${file.path}:${index + 1} hardcodes ${match[0].replace(
                            /^\s+/,
                            "",
                        )}`,
                    );
                }
            });
        }
        return violations;
    },
};

/** R7: CommonJS require defeats static resolution, so core/ bans it outright. */
const noRequireInCore: Rule = {
    id: "R7",
    run: (_rootDir, files) => {
        const violations: Violation[] = [];
        for (const file of files) {
            if (!inDirectory(file, CORE_PREFIX)) continue;
            file.lines.forEach((line, index) => {
                if (!isCodeLine(line)) return;
                if (REQUIRE_CALL.test(line)) {
                    violations.push(
                        `${file.path}:${index + 1} calls require() inside core/`,
                    );
                }
            });
        }
        return violations;
    },
};

const RULES: readonly Rule[] = [
    layerDirection,
    entitiesAreTypes,
    domainExists,
    noDuplicatedRules,
    noPresenters,
    noHardcodedMoney,
    noRequireInCore,
];

export function runArchitectureRules(context: DoctorContext): CheckRunResult {
    const files = collectSourceFiles(context.rootDir);
    const details: string[] = [];
    const counts: string[] = [];

    for (const rule of RULES) {
        const violations = rule.run(context.rootDir, files);
        if (violations.length === 0) continue;
        counts.push(`${rule.id} ${violations.length}`);
        for (const violation of violations) {
            details.push(`${rule.id} ${violation}`);
        }
    }

    if (details.length === 0) {
        return {
            status: "PASS",
            message: `${RULES.length} architecture rules passed across ${files.length} TypeScript files`,
        };
    }
    return {
        status: "FAIL",
        message: `${details.length} architecture violations in ${counts.length} of ${RULES.length} rules: ${counts.join(", ")}`,
        details,
    };
}

export function createArchitectureRulesCheck(
    enabledIn: readonly DoctorProfile[],
    blockingIn: readonly DoctorProfile[],
): DoctorCheck {
    return {
        id: "architecture.rules",
        category: "static",
        enabledIn,
        blockingIn,
        run: async (context) => runArchitectureRules(context),
    };
}
