import type {
    CheckResult,
    DoctorCheck,
    DoctorContext,
    DoctorReport,
    OverallStatus,
} from "../domain/check-result";

function isBlocking(check: DoctorCheck, profile: DoctorContext["profile"]): boolean {
    return check.blockingIn.includes(profile);
}

function skippedCheck(check: DoctorCheck): CheckResult {
    return {
        id: check.id,
        category: check.category,
        status: "SKIP",
        blocking: false,
        message: "Check is not enabled for this profile",
    };
}

function failedCheck(
    check: DoctorCheck,
    context: DoctorContext,
): CheckResult {
    return {
        id: check.id,
        category: check.category,
        status: "FAIL",
        blocking: isBlocking(check, context.profile),
        message: "Check execution failed",
    };
}

function overallStatus(checks: readonly CheckResult[]): OverallStatus {
    if (checks.some((check) => check.status === "FAIL")) return "FAIL";
    if (checks.some((check) => check.status === "WARN")) return "WARN";
    return "PASS";
}

/** Run every registered check in order, marking disabled checks as SKIP. */
export async function runDoctor(
    checks: readonly DoctorCheck[],
    context: DoctorContext,
): Promise<DoctorReport> {
    const results: CheckResult[] = [];

    for (const check of checks) {
        if (!check.enabledIn.includes(context.profile)) {
            results.push(skippedCheck(check));
            continue;
        }

        try {
            const result = await check.run(context);
            results.push({
                id: check.id,
                category: check.category,
                status: result.status,
                blocking: isBlocking(check, context.profile),
                message: result.message,
                ...(result.details === undefined
                    ? {}
                    : { details: result.details }),
            });
        } catch {
            results.push(failedCheck(check, context));
        }
    }

    return {
        schemaVersion: 1,
        profile: context.profile,
        status: overallStatus(results),
        checks: results,
        exitCode: results.some(
            (result) => result.blocking && result.status === "FAIL",
        )
            ? 1
            : 0,
    };
}
