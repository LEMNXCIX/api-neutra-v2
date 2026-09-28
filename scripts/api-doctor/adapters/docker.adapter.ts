import type { CheckRunResult, DoctorContext } from "../domain/check-result";
import {
    type CommandResult,
    type CommandRunner,
    runCommand,
} from "./command.adapter";

const DOCKER_TIMEOUT_MS = 60_000;

function skipped(message: string): CheckRunResult {
    return { status: "SKIP", message };
}

function failed(message: string): CheckRunResult {
    return { status: "FAIL", message };
}

function unavailable(result: CommandResult): boolean {
    return (
        result.timedOut ||
        result.exitCode === null ||
        result.errorCode === "ENOENT"
    );
}

/** Validate only Compose configuration; no lifecycle commands are used. */
export function createDockerComposeCheck(
    runner: CommandRunner = runCommand,
): (context: DoctorContext) => Promise<CheckRunResult> {
    return async (context) => {
        try {
            const version = await runner("docker", ["compose", "version"], {
                cwd: context.rootDir,
                timeoutMs: DOCKER_TIMEOUT_MS,
            });
            if (version.exitCode !== 0 || unavailable(version)) {
                return skipped("Docker Compose is unavailable");
            }

            const files = ["docker-compose.yml", "docker-compose.prod.yml"];
            for (const file of files) {
                const result = await runner(
                    "docker",
                    ["compose", "-f", file, "config", "--quiet"],
                    {
                        cwd: context.rootDir,
                        timeoutMs: DOCKER_TIMEOUT_MS,
                    },
                );
                if (unavailable(result)) {
                    return skipped("Docker Compose became unavailable");
                }
                if (result.exitCode !== 0) {
                    return failed("Docker Compose configuration is invalid");
                }
            }

            return {
                status: "PASS",
                message: "Docker Compose configuration passed",
            };
        } catch {
            return skipped("Docker Compose could not be inspected");
        }
    };
}

export const checkDockerCompose = createDockerComposeCheck();
