import type { CheckRunResult, DoctorContext } from "../domain/check-result";
import { type CommandRunner, runCommand } from "./command.adapter";

const ARTIFACT_TIMEOUT_MS = 180_000;

function failed(message: string): CheckRunResult {
    return { status: "FAIL", message };
}

/** Build and verify the existing production artifact without importing the app. */
export function createProductionArtifactCheck(
    runner: CommandRunner = runCommand,
): (context: DoctorContext) => Promise<CheckRunResult> {
    return async (context) => {
        try {
            const build = await runner("npm", ["run", "build"], {
                cwd: context.rootDir,
                timeoutMs: ARTIFACT_TIMEOUT_MS,
            });
            if (build.timedOut) return failed("Production build timed out");
            if (build.exitCode !== 0) {
                return failed("Production build failed");
            }

            const verification = await runner(
                "npm",
                ["run", "verify:production"],
                {
                    cwd: context.rootDir,
                    timeoutMs: ARTIFACT_TIMEOUT_MS,
                },
            );
            if (verification.timedOut) {
                return failed("Production artifact verification timed out");
            }
            return verification.exitCode === 0
                ? {
                      status: "PASS",
                      message:
                          "Production artifact and OpenAPI verification passed",
                  }
                : failed("Production artifact verification failed");
        } catch {
            return failed(
                "Production artifact verification could not be executed",
            );
        }
    };
}

export const checkProductionArtifact = createProductionArtifactCheck();
