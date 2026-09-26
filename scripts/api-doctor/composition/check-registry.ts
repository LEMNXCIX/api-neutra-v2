import { runCommand, type CommandRunner } from "../adapters/command.adapter";
import { createNpmAuditCheck } from "../adapters/audit.adapter";
import { createDockerComposeCheck } from "../adapters/docker.adapter";
import { checkRuntimeHealth, checkRuntimeReady } from "../adapters/http.adapter";
import { createProductionArtifactCheck } from "../adapters/openapi.adapter";
import {
    checkNodeContract,
    checkPackageLock,
    checkRequiredEnvironment,
} from "../adapters/project.adapter";
import { createPrismaValidateCheck } from "../adapters/prisma.adapter";
import { createArchitectureRulesCheck } from "../adapters/architecture.adapter";
import type {
    CheckCategory,
    CheckRunResult,
    DoctorCheck,
    DoctorProfile,
} from "../domain/check-result";

const ALL_PROFILES: readonly DoctorProfile[] = ["default", "ci", "full"];
const GATED_PROFILES: readonly DoctorProfile[] = ["ci", "full"];
const FULL_PROFILE: readonly DoctorProfile[] = ["full"];

function commandCheck(
    id: string,
    category: CheckCategory,
    command: string,
    args: readonly string[],
    runner: CommandRunner,
    enabledIn: readonly DoctorProfile[],
    blockingIn: readonly DoctorProfile[],
    timeoutMs: number,
): DoctorCheck {
    return {
        id,
        category,
        enabledIn,
        blockingIn,
        run: async (context) => {
            try {
                const result = await runner(command, args, {
                    cwd: context.rootDir,
                    timeoutMs,
                });
                if (result.timedOut) {
                    return { status: "FAIL", message: `${id} timed out` };
                }
                return result.exitCode === 0
                    ? { status: "PASS", message: `${id} passed` }
                    : { status: "FAIL", message: `${id} failed` };
            } catch {
                return {
                    status: "FAIL",
                    message: `${id} could not be executed`,
                };
            }
        },
    };
}

function integrationCheck(runner: CommandRunner): DoctorCheck {
    return {
        id: "integration",
        category: "runtime",
        // Gated rather than full-only: the eight suites under `test/` are the
        // only coverage that touches a real database, and for a long time
        // nothing ran them at all, because the ci profile skipped this check.
        // It stays behind --include-integration so a local run without a
        // database is still possible, but CI passes the flag and treats a
        // skip here as the failure it is.
        enabledIn: GATED_PROFILES,
        blockingIn: GATED_PROFILES,
        run: async (context): Promise<CheckRunResult> => {
            if (!context.includeIntegration) {
                return {
                    status: "SKIP",
                    message: "Integration tests were not explicitly enabled",
                };
            }
            try {
                const result = await runner("npm", ["run", "test:ci"], {
                    cwd: context.rootDir,
                    timeoutMs: 600_000,
                });
                if (result.timedOut) {
                    return { status: "FAIL", message: "Integration tests timed out" };
                }
                return result.exitCode === 0
                    ? { status: "PASS", message: "Integration tests passed" }
                    : { status: "FAIL", message: "Integration tests failed" };
            } catch {
                return {
                    status: "FAIL",
                    message: "Integration tests could not be executed",
                };
            }
        },
    };
}

export function createCheckRegistry(
    runner: CommandRunner = runCommand,
): DoctorCheck[] {
    return [
        {
            id: "node.contract",
            category: "configuration",
            enabledIn: ALL_PROFILES,
            blockingIn: GATED_PROFILES,
            run: checkNodeContract,
        },
        {
            id: "package.lock",
            category: "configuration",
            enabledIn: ALL_PROFILES,
            blockingIn: GATED_PROFILES,
            run: checkPackageLock,
        },
        {
            id: "env.required",
            category: "configuration",
            enabledIn: ALL_PROFILES,
            blockingIn: GATED_PROFILES,
            run: checkRequiredEnvironment,
        },
        {
            id: "prisma.validate",
            category: "configuration",
            enabledIn: ALL_PROFILES,
            blockingIn: GATED_PROFILES,
            run: createPrismaValidateCheck(runner),
        },
        commandCheck(
            "typecheck",
            "static",
            "npx",
            ["--no-install", "tsc", "--noEmit"],
            runner,
            ALL_PROFILES,
            GATED_PROFILES,
            180_000,
        ),
        commandCheck(
            "architecture",
            "static",
            "npm",
            ["run", "check:arch"],
            runner,
            ALL_PROFILES,
            GATED_PROFILES,
            120_000,
        ),
        // Real Clean Architecture rules, not a shell-out. The command check above
        // only recognises the @/ alias form of an import, so a core/ module
        // could reach infrastructure through a relative path or a require()
        // and still pass it. This one resolves all three, and also enforces
        // that the domain layer exists, that entities stay types only, that a
        // business rule is not implemented in two layers at once, and that the
        // deleted presenter layer stays deleted.
        //
        // Note: keep this comment free of a literal aliased import specifier.
        // verify-production-build.ts rewrites aliases in the emitted dist
        // without skipping comments, so writing one out here makes it resolve a
        // phantom specifier and fail the production build.
        createArchitectureRulesCheck(ALL_PROFILES, GATED_PROFILES),
        commandCheck(
            "unit",
            "static",
            "npm",
            ["run", "test:unit"],
            runner,
            ALL_PROFILES,
            GATED_PROFILES,
            600_000,
        ),
        {
            id: "production.artifact",
            category: "deployment",
            enabledIn: ALL_PROFILES,
            blockingIn: GATED_PROFILES,
            run: createProductionArtifactCheck(runner),
        },
        {
            id: "npm.audit",
            category: "security",
            enabledIn: ALL_PROFILES,
            blockingIn: GATED_PROFILES,
            run: createNpmAuditCheck(runner),
        },
        {
            id: "docker.compose",
            category: "deployment",
            enabledIn: ALL_PROFILES,
            blockingIn: GATED_PROFILES,
            run: createDockerComposeCheck(runner),
        },
        {
            id: "runtime.health",
            category: "runtime",
            enabledIn: ALL_PROFILES,
            blockingIn: FULL_PROFILE,
            run: checkRuntimeHealth,
        },
        {
            id: "runtime.ready",
            category: "runtime",
            enabledIn: ALL_PROFILES,
            blockingIn: FULL_PROFILE,
            run: checkRuntimeReady,
        },
        integrationCheck(runner),
    ];
}

export const checkRegistry = createCheckRegistry();
