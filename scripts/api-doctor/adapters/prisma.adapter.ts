import { runCommand, type CommandRunner } from "./command.adapter";
import type {
    CheckRunResult,
    DoctorContext,
} from "../domain/check-result";

const VALIDATION_TIMEOUT_MS = 120_000;

function unavailable(context: DoctorContext): CheckRunResult {
    return {
        status: context.profile === "default" ? "SKIP" : "FAIL",
        message: "DATABASE_URL is required for Prisma validation",
    };
}

function failed(message: string): CheckRunResult {
    return { status: "FAIL", message };
}

/** Build the local, read-only Prisma validation check. */
export function createPrismaValidateCheck(
    runner: CommandRunner = runCommand,
): (context: DoctorContext) => Promise<CheckRunResult> {
    return async (context) => {
        let hasDatabaseUrl: boolean;
        try {
            hasDatabaseUrl = context.hasEnvKey("DATABASE_URL");
        } catch {
            return failed("Database environment presence could not be checked");
        }
        if (!hasDatabaseUrl) return unavailable(context);

        try {
            const result = await runner(
                "npx",
                ["--no-install", "prisma", "validate"],
                {
                    cwd: context.rootDir,
                    timeoutMs: VALIDATION_TIMEOUT_MS,
                },
            );
            if (result.timedOut) return failed("Prisma validation timed out");
            return result.exitCode === 0
                ? { status: "PASS", message: "Prisma schema validation passed" }
                : failed("Prisma schema validation failed");
        } catch {
            return failed("Prisma validation could not be executed");
        }
    };
}

export const checkPrismaValidate = createPrismaValidateCheck();
