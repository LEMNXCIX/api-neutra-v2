import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDoctor } from "../../scripts/api-doctor/application/run-doctor";
import {
    renderJsonReport,
    renderSarifReport,
    renderTextReport,
} from "../../scripts/api-doctor/reporting/reporter";
import {
    buildDoctorContext,
    InvalidDoctorArgumentsError,
    parseArgs,
} from "../../scripts/api-doctor/cli";
import { createCheckRegistry } from "../../scripts/api-doctor/composition/check-registry";
import {
    createProductionArtifactCheck,
} from "../../scripts/api-doctor/adapters/openapi.adapter";
import {
    checkNodeContract,
    checkPackageLock,
    checkRequiredEnvironment,
} from "../../scripts/api-doctor/adapters/project.adapter";
import { createPrismaValidateCheck } from "../../scripts/api-doctor/adapters/prisma.adapter";
import { createNpmAuditCheck } from "../../scripts/api-doctor/adapters/audit.adapter";
import { createRuntimeEndpointCheck } from "../../scripts/api-doctor/adapters/http.adapter";
import type {
    CommandResult,
    CommandRunner,
} from "../../scripts/api-doctor/adapters/command.adapter";
import type {
    CheckStatus,
    DoctorCheck,
    DoctorContext,
    DoctorProfile,
    DoctorReport,
} from "../../scripts/api-doctor/domain/check-result";

function context(overrides: Partial<DoctorContext> = {}): DoctorContext {
    return {
        rootDir: process.cwd(),
        profile: "default",
        includeIntegration: false,
        hasEnvKey: () => true,
        ...overrides,
    };
}

function commandResult(overrides: Partial<CommandResult> = {}): CommandResult {
    return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: "",
        stderr: "",
        errorCode: null,
        truncated: false,
        ...overrides,
    };
}

function check(
    id: string,
    status: CheckStatus,
    enabledIn: readonly DoctorProfile[],
    blockingIn: readonly DoctorProfile[],
): DoctorCheck {
    return {
        id,
        category: "static",
        enabledIn,
        blockingIn,
        run: async () => ({ status, message: `${id} result` }),
    };
}

describe("api-doctor runner", () => {
    it("keeps registry order, marks disabled checks, and does not fail fast", async () => {
        const checks: DoctorCheck[] = [
            check("pass", "PASS", ["ci"], ["ci"]),
            check("disabled", "FAIL", ["full"], ["full"]),
            check("optional-failure", "FAIL", ["ci"], []),
            check("after-failure", "PASS", ["ci"], ["ci"]),
        ];

        const report = await runDoctor(checks, context({ profile: "ci" }));

        expect(report.checks.map((result) => [result.id, result.status])).toEqual([
            ["pass", "PASS"],
            ["disabled", "SKIP"],
            ["optional-failure", "FAIL"],
            ["after-failure", "PASS"],
        ]);
        expect(report.status).toBe("FAIL");
        expect(report.exitCode).toBe(0);
    });

    it("returns exit code one only for a blocking failure", async () => {
        const report = await runDoctor(
            [check("blocking", "FAIL", ["ci"], ["ci"])],
            context({ profile: "ci" }),
        );

        expect(report.exitCode).toBe(1);
    });

    it("converts an unexpected check exception into a safe failure", async () => {
        const throwingCheck: DoctorCheck = {
            id: "throwing",
            category: "static",
            enabledIn: ["ci"],
            blockingIn: [],
            run: async () => {
                throw new Error("secret-value-must-not-escape");
            },
        };

        const result = await runDoctor([throwingCheck], context({ profile: "ci" }));

        expect(result.checks[0]).toMatchObject({
            status: "FAIL",
            message: "Check execution failed",
        });
        expect(JSON.stringify(result)).not.toContain("secret-value-must-not-escape");
    });
});

describe("api-doctor reporting", () => {
    const report: DoctorReport = {
        schemaVersion: 1,
        profile: "ci",
        status: "WARN",
        checks: [
            {
                id: "node.contract",
                category: "configuration",
                status: "PASS",
                blocking: true,
                message: "Node contract is valid",
            },
            {
                id: "runtime.ready",
                category: "runtime",
                status: "WARN",
                blocking: false,
                message: "Runtime check was skipped",
                details: ["safe detail"],
            },
        ],
        exitCode: 0,
    };

    it("renders text, JSON, and SARIF without secret-like values", () => {
        const text = renderTextReport(report);
        const json = renderJsonReport(report);
        const sarif = renderSarifReport(report);

        expect(text).toContain("node.contract");
        expect(text).toContain("runtime.ready");
        expect(text).toContain("PASS");
        expect(json).toContain('"node.contract"');
        expect(sarif).toContain('"ruleId": "node.contract"');
        for (const output of [text, json, sarif]) {
            expect(output).not.toMatch(/postgres:\/\/|password=|token=/i);
        }
    });
});

describe("api-doctor project checks", () => {
    const temporaryRoots: string[] = [];

    afterEach(() => {
        for (const root of temporaryRoots.splice(0)) {
            rmSync(root, { recursive: true, force: true });
        }
    });

    function projectFixture(): string {
        const root = mkdtempSync(join(tmpdir(), "api-doctor-"));
        temporaryRoots.push(root);
        const major = Number(process.versions.node.split(".")[0]);
        const packageJson = {
            name: "fixture",
            version: "1.0.0",
            license: "ISC",
            engines: { node: `>=${major}.0.0` },
            dependencies: { "runtime-package": "1.0.0" },
            devDependencies: { typescript: "7.0.0" },
        };
        const lock = {
            name: packageJson.name,
            version: packageJson.version,
            lockfileVersion: 3,
            packages: {
                "": {
                    ...packageJson,
                },
            },
        };
        writeFileSync(
            join(root, "package.json"),
            JSON.stringify(packageJson),
        );
        writeFileSync(
            join(root, "package-lock.json"),
            JSON.stringify(lock),
        );
        writeFileSync(join(root, "Dockerfile.dev"), `FROM node:${major}-alpine\n`);
        writeFileSync(join(root, "Dockerfile.prod"), `FROM node:${major}-alpine\n`);
        mkdirSync(join(root, ".github/workflows"), { recursive: true });
        writeFileSync(
            join(root, ".github/workflows/CI.yml"),
            `node-version: ${major}.x\n`,
        );
        writeFileSync(join(root, "app.yaml"), `runtime: nodejs${major}\n`);
        return root;
    }

    it("normalizes the Node major and compares lock metadata", async () => {
        const root = projectFixture();
        const nodeResult = await checkNodeContract(context({ rootDir: root }));
        const lockResult = await checkPackageLock(context({ rootDir: root }));

        expect(nodeResult.status).toBe("PASS");
        expect(lockResult.status).toBe("PASS");
    });

    it("enforces the declared Node minimum version", async () => {
        const root = projectFixture();
        const packagePath = join(root, "package.json");
        const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
            engines: { node: string };
        };
        const major = Number(process.versions.node.split(".")[0]);
        packageJson.engines.node = `>=${major}.999.0`;
        writeFileSync(packagePath, JSON.stringify(packageJson));

        const result = await checkNodeContract(context({ rootDir: root }));

        expect(result.status).toBe("FAIL");
        expect(result.details).toContain(
            "actual Node version does not satisfy package.json engines",
        );
    });

    it("reports lock dependency-map drift", async () => {
        const root = projectFixture();
        const lockPath = join(root, "package-lock.json");
        const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
            packages: { "": { dependencies: Record<string, string> } };
        };
        lock.packages[""].dependencies["runtime-package"] = "2.0.0";
        writeFileSync(lockPath, JSON.stringify(lock));

        const result = await checkPackageLock(context({ rootDir: root }));

        expect(result.status).toBe("FAIL");
        expect(result.details).toContain("dependencies map mismatch");
    });

    it("accepts the complete DB fallback without requiring Redis in default", async () => {
        const keys = new Set([
            "DB_USERNAME",
            "DB_PASSWORD",
            "DB_HOST",
            "DB_NAME",
            "JWT_SECRET",
            "SESSION_SECRET",
        ]);

        const result = await checkRequiredEnvironment(
            context({
                hasEnvKey: (key) => keys.has(key),
            }),
        );

        expect(result.status).toBe("PASS");
        expect(result.details).toBeUndefined();
    });

    it("does not accept DB_Name as the runtime DB key", async () => {
        const keys = new Set([
            "DB_USERNAME",
            "DB_PASSWORD",
            "DB_HOST",
            "DB_Name",
            "JWT_SECRET",
            "SESSION_SECRET",
        ]);

        const result = await checkRequiredEnvironment(
            context({ hasEnvKey: (key) => keys.has(key) }),
        );

        expect(result.status).toBe("WARN");
        expect(result.details).toContain(
            "DATABASE_URL or complete DB_* configuration",
        );
    });

    it("keeps DATABASE_URL required for Prisma validation", async () => {
        const calls: Array<{ command: string; args: readonly string[] }> = [];
        const runner: CommandRunner = async (command, args = []) => {
            calls.push({ command, args });
            return commandResult();
        };
        const keys = new Set([
            "DB_USERNAME",
            "DB_PASSWORD",
            "DB_HOST",
            "DB_NAME",
        ]);
        const prismaCheck = createPrismaValidateCheck(runner);

        const skipped = await prismaCheck(
            context({ hasEnvKey: (key) => keys.has(key) }),
        );
        expect(skipped.status).toBe("SKIP");
        expect(calls).toHaveLength(0);

        const passed = await prismaCheck(
            context({ hasEnvKey: (key) => key === "DATABASE_URL" }),
        );
        expect(passed.status).toBe("PASS");
        expect(calls[0]).toEqual({
            command: "npx",
            args: ["--no-install", "prisma", "validate"],
        });
    });
});

describe("api-doctor adapters", () => {
    it("uses an injected command runner for production verification", async () => {
        const calls: Array<{ command: string; args: readonly string[] }> = [];
        const runner: CommandRunner = async (command, args = []) => {
            calls.push({ command, args });
            return commandResult();
        };

        const result = await createProductionArtifactCheck(runner)(context());

        expect(result.status).toBe("PASS");
        expect(calls).toEqual([
            { command: "npm", args: ["run", "build"] },
            { command: "npm", args: ["run", "verify:production"] },
        ]);
    });

    it("classifies audit vulnerabilities and registry failures safely", async () => {
        const vulnerableRunner: CommandRunner = async () =>
            commandResult({
                exitCode: 1,
                stdout: JSON.stringify({
                    metadata: {
                        vulnerabilities: {
                            total: 2,
                            high: 1,
                            critical: 1,
                        },
                    },
                    vulnerabilities: {
                        "secret-package": {
                            fixAvailable: {
                                name: "secret-package",
                                version: "1.0.1",
                                isSemVerMajor: false,
                            },
                        },
                    },
                }),
            });
        const vulnerable = await createNpmAuditCheck(vulnerableRunner)(
            context(),
        );
        expect(vulnerable.status).toBe("FAIL");
        expect(vulnerable.details).toEqual([
            "total=2",
            "high=1",
            "critical=1",
        ]);
        expect(JSON.stringify(vulnerable)).not.toContain("secret-package");

        const networkRunner: CommandRunner = async () =>
            commandResult({
                exitCode: 1,
                errorCode: "ENOTFOUND",
                stderr: "request to registry.npmjs.org failed",
            });
        const unavailable = await createNpmAuditCheck(networkRunner)(
            context(),
        );
        expect(unavailable.status).toBe("SKIP");
    });

    it("warns for breaking-only or unfixable audit findings", async () => {
        const warningRunner: CommandRunner = async () =>
            commandResult({
                exitCode: 1,
                stdout: JSON.stringify({
                    metadata: {
                        vulnerabilities: {
                            total: 2,
                            high: 0,
                            critical: 0,
                        },
                    },
                    vulnerabilities: {
                        "breaking-package": {
                            fixAvailable: {
                                name: "breaking-package",
                                version: "2.0.0",
                                isSemVerMajor: true,
                            },
                        },
                        "unfixable-package": { fixAvailable: false },
                    },
                }),
            });

        const warned = await createNpmAuditCheck(warningRunner)(context());

        expect(warned.status).toBe("WARN");
        expect(warned.details).toEqual([
            "total=2",
            "high=0",
            "critical=0",
        ]);
        expect(JSON.stringify(warned)).not.toContain("breaking-package");
        expect(JSON.stringify(warned)).not.toContain("unfixable-package");
    });

    it("maps HTTP status by profile without reading response bodies", async () => {
        const urls: string[] = [];
        const fakeFetch = (async (input: string | URL) => {
            urls.push(String(input));
            return { status: 503 } as Response;
        }) as typeof fetch;
        const check = createRuntimeEndpointCheck("/ready", fakeFetch);

        const skipped = await check(context());
        expect(skipped.status).toBe("SKIP");

        const warned = await check(
            context({ runtimeUrl: "http://localhost:4001/api?token=secret" }),
        );
        expect(warned.status).toBe("WARN");
        expect(urls[0]).toBe("http://localhost:4001/api/ready");

        const failed = await check(
            context({
                profile: "full",
                runtimeUrl: "http://localhost:4001",
            }),
        );
        expect(failed.status).toBe("FAIL");
    });

    it("keeps the registry order stable", () => {
        const runner: CommandRunner = async () => commandResult();
        const registry = createCheckRegistry(runner);

        expect(registry.map((item) => item.id)).toEqual([
            "node.contract",
            "package.lock",
            "env.required",
            "prisma.validate",
            "typecheck",
            "architecture",
            "unit",
            "production.artifact",
            "npm.audit",
            "docker.compose",
            "runtime.health",
            "runtime.ready",
            "integration",
        ]);
    });
});

describe("api-doctor CLI parsing", () => {
    it("parses supported options and defaults", () => {
        expect(parseArgs([])).toEqual({
            profile: "default",
            format: "text",
            includeIntegration: false,
            help: false,
        });
        expect(
            parseArgs([
                "--profile",
                "ci",
                "--format=json",
                "--runtime-url",
                "http://localhost:4001",
                "--include-integration",
            ]),
        ).toEqual({
            profile: "ci",
            format: "json",
            runtimeUrl: "http://localhost:4001",
            includeIntegration: true,
            help: false,
        });
    });

    it("rejects unknown and invalid options", () => {
        expect(() => parseArgs(["--unknown"])).toThrow(
            InvalidDoctorArgumentsError,
        );
        expect(() => parseArgs(["--profile", "invalid"])).toThrow(
            InvalidDoctorArgumentsError,
        );
        expect(() => parseArgs(["--format", "yaml"])).toThrow(
            InvalidDoctorArgumentsError,
        );
    });

    it("builds a presence-only environment context", () => {
        const options = parseArgs([]);
        const doctorContext = buildDoctorContext(options, "/tmp/fixture");

        expect(doctorContext.rootDir).toBe("/tmp/fixture");
        expect(doctorContext.hasEnvKey("PATH")).toBe(
            Object.prototype.hasOwnProperty.call(process.env, "PATH"),
        );
    });
});
