import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CheckRunResult, DoctorContext } from "../domain/check-result";

type JsonRecord = Record<string, unknown>;

type JsonReadResult = { ok: true; value: unknown } | { ok: false };

function asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as JsonRecord;
}

function readJson(filePath: string): JsonReadResult {
    try {
        return {
            ok: true,
            value: JSON.parse(readFileSync(filePath, "utf8")) as unknown,
        };
    } catch {
        return { ok: false };
    }
}

function readText(filePath: string): string | null {
    try {
        return readFileSync(filePath, "utf8");
    } catch {
        return null;
    }
}

function pass(message: string, details?: string[]): CheckRunResult {
    return {
        status: "PASS",
        message,
        ...(details === undefined ? {} : { details }),
    };
}

function fail(message: string, details?: string[]): CheckRunResult {
    return {
        status: "FAIL",
        message,
        ...(details === undefined ? {} : { details }),
    };
}

export interface NodeMinimumVersion {
    major: number;
    minor: number;
    patch: number;
}

function versionFromMatch(match: RegExpMatchArray): NodeMinimumVersion | null {
    const major = Number(match[1]);
    const minor = Number(match[2] ?? 0);
    const patch = Number(match[3] ?? 0);
    if (
        !Number.isInteger(major) ||
        !Number.isInteger(minor) ||
        !Number.isInteger(patch)
    ) {
        return null;
    }
    return { major, minor, patch };
}

export function parseNodeMinimum(value: unknown): NodeMinimumVersion | null {
    if (typeof value !== "string") return null;
    const match = value.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    return match ? versionFromMatch(match) : null;
}

function parseActualVersion(value: string): NodeMinimumVersion | null {
    const match = value.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    return match ? versionFromMatch(match) : null;
}

export function nodeVersionSatisfiesMinimum(
    actual: string,
    minimum: NodeMinimumVersion,
): boolean {
    const version = parseActualVersion(actual);
    if (!version || version.major !== minimum.major) return false;
    if (version.minor !== minimum.minor) {
        return version.minor > minimum.minor;
    }
    return version.patch >= minimum.patch;
}

function uniqueMajors(values: readonly number[]): number[] {
    return [...new Set(values)];
}

function dockerMajors(content: string): number[] {
    return uniqueMajors(
        [...content.matchAll(/^FROM\s+node:(\d+)(?:[-.\s]|$)/gim)].map(
            (match) => Number(match[1]),
        ),
    );
}

function ciNodeMajors(content: string): number[] {
    return uniqueMajors(
        [
            ...content.matchAll(
                /^\s*node-version:\s*["']?(\d+)(?:\.x|\.\*)?["']?\s*$/gim,
            ),
        ].map((match) => Number(match[1])),
    );
}

function appEngineMajors(content: string): number[] {
    return uniqueMajors(
        [...content.matchAll(/^\s*runtime:\s*nodejs(\d+)\s*$/gim)].map(
            (match) => Number(match[1]),
        ),
    );
}

function stableJson(value: unknown): string | null {
    if (value === undefined) return null;
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value) ?? "null";
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableJson(item) ?? "null").join(",")}]`;
    }
    const record = value as JsonRecord;
    return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
        .join(",")}}`;
}

function dependencyMap(value: unknown): string | null {
    const record = asRecord(value);
    return record ? stableJson(record) : null;
}

/** Compare the canonical major declared by package.json with every runtime declaration. */
export async function checkNodeContract(
    context: DoctorContext,
): Promise<CheckRunResult> {
    const packageData = readJson(join(context.rootDir, "package.json"));
    const packageRecord = packageData.ok ? asRecord(packageData.value) : null;
    const engines = asRecord(packageRecord?.engines);
    const minimum = parseNodeMinimum(engines?.node);
    const expectedMajor = minimum?.major ?? null;
    if (!packageRecord || minimum === null) {
        return fail(
            "Node runtime contract could not be read from package.json",
        );
    }

    const mismatches: string[] = [];
    if (!nodeVersionSatisfiesMinimum(process.versions.node, minimum)) {
        mismatches.push(
            "actual Node version does not satisfy package.json engines",
        );
    }

    const declarations: Array<{
        label: string;
        file: string;
        extract: (content: string) => number[];
    }> = [
        {
            label: "Dockerfile.dev",
            file: "Dockerfile.dev",
            extract: dockerMajors,
        },
        {
            label: "Dockerfile.prod",
            file: "Dockerfile.prod",
            extract: dockerMajors,
        },
        {
            label: "CI.yml",
            file: ".github/workflows/CI.yml",
            extract: ciNodeMajors,
        },
        {
            label: "app.yaml",
            file: "app.yaml",
            extract: appEngineMajors,
        },
    ];

    for (const declaration of declarations) {
        const content = readText(join(context.rootDir, declaration.file));
        if (content === null) {
            mismatches.push(`${declaration.label} could not be read`);
            continue;
        }
        const majors = declaration.extract(content);
        if (
            majors.length === 0 ||
            majors.some((major) => major !== expectedMajor)
        ) {
            mismatches.push(`${declaration.label} major mismatch`);
        }
    }

    return mismatches.length === 0
        ? pass("Node runtime contract is consistent")
        : fail("Node runtime contract is inconsistent", mismatches);
}

/** Compare package.json with the lockfile root metadata and dependency maps. */
export async function checkPackageLock(
    context: DoctorContext,
): Promise<CheckRunResult> {
    const packageData = readJson(join(context.rootDir, "package.json"));
    const lockData = readJson(join(context.rootDir, "package-lock.json"));
    const packageRecord = packageData.ok ? asRecord(packageData.value) : null;
    const lockRecord = lockData.ok ? asRecord(lockData.value) : null;
    const packages = lockRecord ? asRecord(lockRecord.packages) : null;
    const root = packages ? asRecord(packages[""]) : null;
    if (!packageRecord || !root) {
        return fail("Package and lockfile root metadata could not be read");
    }

    const mismatches: string[] = [];
    for (const field of ["name", "version", "license", "engines"]) {
        if (stableJson(packageRecord[field]) !== stableJson(root[field])) {
            mismatches.push(`${field} metadata mismatch`);
        }
    }

    for (const field of [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
    ]) {
        if (
            dependencyMap(packageRecord[field]) !== dependencyMap(root[field])
        ) {
            mismatches.push(`${field} map mismatch`);
        }
    }

    return mismatches.length === 0
        ? pass("Package and lockfile metadata are consistent")
        : fail("Package and lockfile metadata are inconsistent", mismatches);
}

/** Check only key presence; environment values are never read or returned. */
export async function checkRequiredEnvironment(
    context: DoctorContext,
): Promise<CheckRunResult> {
    const missing: string[] = [];
    try {
        const hasDatabaseUrl = context.hasEnvKey("DATABASE_URL");
        const hasLegacyDatabase =
            ["DB_USERNAME", "DB_PASSWORD", "DB_HOST"].every((key) =>
                context.hasEnvKey(key),
            ) && context.hasEnvKey("DB_NAME");

        if (!hasDatabaseUrl && !hasLegacyDatabase) {
            missing.push("DATABASE_URL or complete DB_* configuration");
        }
        for (const key of ["JWT_SECRET", "SESSION_SECRET"]) {
            if (!context.hasEnvKey(key)) missing.push(key);
        }
        if (context.profile === "full") {
            for (const key of ["REDIS_HOST", "REDIS_PORT"]) {
                if (!context.hasEnvKey(key)) missing.push(key);
            }
            for (const key of ["POSTGRES_USER", "POSTGRES_PASSWORD"]) {
                if (!context.hasEnvKey(key)) missing.push(key);
            }
        }
    } catch {
        return fail("Environment key presence could not be checked");
    }

    if (missing.length === 0) {
        return pass("Required environment keys are present");
    }
    return {
        status: context.profile === "default" ? "WARN" : "FAIL",
        message: "Required environment keys are missing",
        details: missing,
    };
}

export const checkEnvironmentPresence = checkRequiredEnvironment;
