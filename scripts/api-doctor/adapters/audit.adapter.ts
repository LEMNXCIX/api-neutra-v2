import { runCommand, type CommandRunner, type CommandResult } from "./command.adapter";
import type {
    CheckRunResult,
    DoctorContext,
} from "../domain/check-result";

const AUDIT_TIMEOUT_MS = 120_000;

type JsonRecord = Record<string, unknown>;

interface AuditSummary {
    total: number;
    high: number;
    critical: number;
    nonBreakingFixes: number;
}

function asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as JsonRecord;
}

function numberValue(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAudit(output: string): AuditSummary | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(output) as unknown;
    } catch {
        return null;
    }

    const root = asRecord(parsed);
    const metadata = asRecord(root?.metadata);
    const counts = asRecord(metadata?.vulnerabilities);
    if (!counts) return null;

    const high = numberValue(counts.high) ?? 0;
    const critical = numberValue(counts.critical) ?? 0;
    const total =
        numberValue(counts.total) ??
        high + critical +
            (numberValue(counts.moderate) ?? 0) +
            (numberValue(counts.low) ?? 0) +
            (numberValue(counts.info) ?? 0);

    const entries = asRecord(root?.vulnerabilities) ?? {};
    let nonBreakingFixes = 0;
    for (const entry of Object.values(entries)) {
        const fix = asRecord(entry)?.fixAvailable;
        if (fix === true) {
            nonBreakingFixes += 1;
        } else if (asRecord(fix) && asRecord(fix)?.isSemVerMajor !== true) {
            nonBreakingFixes += 1;
        }
    }

    return { total, high, critical, nonBreakingFixes };
}

function networkFailure(result: CommandResult): boolean {
    if (result.timedOut) return true;
    const code = result.errorCode?.toLowerCase() ?? "";
    if (
        [
            "enotfound",
            "eai_again",
            "etimedout",
            "econnrefused",
            "econnreset",
            "enetunreach",
            "ehostunreach",
        ].includes(code)
    ) {
        return true;
    }

    const output = `${result.stderr}\n${result.stdout}`.toLowerCase();
    return [
        "enotfound",
        "eai_again",
        "etimedout",
        "econnrefused",
        "econnreset",
        "enetunreach",
        "ehostunreach",
        "network is unreachable",
        "registry.npmjs.org",
        "offline",
    ].some((marker) => output.includes(marker));
}

function auditDetails(summary: AuditSummary): string[] {
    return [
        `total=${summary.total}`,
        `high=${summary.high}`,
        `critical=${summary.critical}`,
    ];
}

/** Run npm audit without ever exposing its payload or applying a fix. */
export function createNpmAuditCheck(
    runner: CommandRunner = runCommand,
): (context: DoctorContext) => Promise<CheckRunResult> {
    return async (context) => {
        try {
            const result = await runner(
                "npm",
                ["audit", "--json", "--audit-level=high"],
                {
                    cwd: context.rootDir,
                    timeoutMs: AUDIT_TIMEOUT_MS,
                },
            );
            if (networkFailure(result)) {
                return {
                    status: "SKIP",
                    message: "npm audit could not reach the registry",
                };
            }

            const summary = parseAudit(result.stdout);
            if (!summary) {
                return {
                    status: "FAIL",
                    message: "npm audit output could not be verified",
                };
            }
            if (summary.total === 0) {
                return {
                    status: "PASS",
                    message: "npm audit found no vulnerabilities",
                    details: auditDetails(summary),
                };
            }
            if (summary.nonBreakingFixes > 0) {
                return {
                    status: "FAIL",
                    message: "npm audit found fixable vulnerabilities",
                    details: auditDetails(summary),
                };
            }
            return {
                status: "WARN",
                message:
                    "npm audit found vulnerabilities without a non-breaking fix",
                details: auditDetails(summary),
            };
        } catch {
            return {
                status: "SKIP",
                message: "npm audit could not be executed",
            };
        }
    };
}

export const checkNpmAudit = createNpmAuditCheck();
