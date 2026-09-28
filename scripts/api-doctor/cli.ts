import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { runDoctor } from "./application/run-doctor";
import { createCheckRegistry } from "./composition/check-registry";
import type { DoctorContext, DoctorProfile } from "./domain/check-result";
import { type ReportFormat, renderReport } from "./reporting/reporter";

export interface DoctorCliOptions {
    profile: DoctorProfile;
    format: ReportFormat;
    runtimeUrl?: string;
    includeIntegration: boolean;
    help: boolean;
}

export class InvalidDoctorArgumentsError extends Error {}

const HELP_TEXT = `Usage: npm run doctor -- [options]

Options:
  --profile default|ci|full       Select the check profile
  --format text|json|sarif        Select the report format
  --runtime-url URL              Check live /health and /ready endpoints
  --include-integration          Run the explicit integration profile checks
  --help                         Show this help
`;

function optionParts(argument: string): {
    flag: string;
    value?: string;
} {
    const separator = argument.indexOf("=");
    return separator === -1
        ? { flag: argument }
        : {
              flag: argument.slice(0, separator),
              value: argument.slice(separator + 1),
          };
}

function requireOptionValue(
    argv: readonly string[],
    index: number,
    inlineValue: string | undefined,
): string {
    if (inlineValue !== undefined) {
        if (inlineValue.length === 0) {
            throw new InvalidDoctorArgumentsError();
        }
        return inlineValue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
        throw new InvalidDoctorArgumentsError();
    }
    return value;
}

function validateProfile(value: string): DoctorProfile {
    if (value === "default" || value === "ci" || value === "full") {
        return value;
    }
    throw new InvalidDoctorArgumentsError();
}

function validateFormat(value: string): ReportFormat {
    if (value === "text" || value === "json" || value === "sarif") {
        return value;
    }
    throw new InvalidDoctorArgumentsError();
}

function validateRuntimeUrl(value: string): string {
    try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error();
        }
        return value;
    } catch {
        throw new InvalidDoctorArgumentsError();
    }
}

/** Parse the small, dependency-free CLI surface. */
export function parseArgs(argv: readonly string[]): DoctorCliOptions {
    const options: DoctorCliOptions = {
        profile: "default",
        format: "text",
        includeIntegration: false,
        help: false,
    };

    for (let index = 0; index < argv.length; index++) {
        const { flag, value: inlineValue } = optionParts(argv[index]);
        switch (flag) {
            case "--help":
            case "-h":
                if (inlineValue !== undefined) {
                    throw new InvalidDoctorArgumentsError();
                }
                options.help = true;
                break;
            case "--include-integration":
                if (inlineValue !== undefined) {
                    throw new InvalidDoctorArgumentsError();
                }
                options.includeIntegration = true;
                break;
            case "--profile": {
                const value = requireOptionValue(argv, index, inlineValue);
                options.profile = validateProfile(value);
                if (inlineValue === undefined) index++;
                break;
            }
            case "--format": {
                const value = requireOptionValue(argv, index, inlineValue);
                options.format = validateFormat(value);
                if (inlineValue === undefined) index++;
                break;
            }
            case "--runtime-url": {
                const value = requireOptionValue(argv, index, inlineValue);
                options.runtimeUrl = validateRuntimeUrl(value);
                if (inlineValue === undefined) index++;
                break;
            }
            default:
                throw new InvalidDoctorArgumentsError();
        }
    }

    return options;
}

/** Resolve the repository from the script location, independent of cwd. */
export function resolveRootDir(): string {
    let current = __dirname;
    while (true) {
        if (existsSync(join(current, "package.json"))) return current;
        const parent = dirname(current);
        if (parent === current) return resolve(__dirname, "../..");
        current = parent;
    }
}

export function buildDoctorContext(
    options: DoctorCliOptions,
    rootDir = resolveRootDir(),
): DoctorContext {
    return {
        rootDir,
        profile: options.profile,
        ...(options.runtimeUrl === undefined
            ? {}
            : { runtimeUrl: options.runtimeUrl }),
        includeIntegration: options.includeIntegration,
        hasEnvKey: (key) =>
            Object.prototype.hasOwnProperty.call(process.env, key),
    };
}

export async function main(
    argv: readonly string[] = process.argv.slice(2),
): Promise<number> {
    let options: DoctorCliOptions;
    try {
        options = parseArgs(argv);
    } catch {
        process.stderr.write("Invalid api-doctor arguments\n");
        return 2;
    }

    if (options.help) {
        process.stdout.write(HELP_TEXT);
        return 0;
    }

    try {
        const report = await runDoctor(
            createCheckRegistry(),
            buildDoctorContext(options),
        );
        process.stdout.write(renderReport(report, options.format));
        return report.exitCode;
    } catch {
        process.stderr.write("api-doctor could not complete\n");
        return 2;
    }
}

if (require.main === module) {
    void main().then(
        (exitCode) => {
            process.exitCode = exitCode;
        },
        () => {
            process.stderr.write("api-doctor could not complete\n");
            process.exitCode = 2;
        },
    );
}
