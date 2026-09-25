import { execFile } from "node:child_process";

export interface CommandOptions {
    cwd?: string;
    timeoutMs?: number;
    maxOutputBytes?: number;
}

export interface CommandResult {
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    timedOut: boolean;
    stdout: string;
    stderr: string;
    errorCode: string | null;
    truncated: boolean;
}

export type CommandRunner = (
    command: string,
    args?: readonly string[],
    options?: CommandOptions,
) => Promise<CommandResult>;

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024;

function positiveInteger(value: number | undefined, fallback: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(1, Math.floor(value));
}

function boundedOutput(
    value: string | Buffer,
    maxBytes: number,
): { text: string; truncated: boolean } {
    const buffer = Buffer.isBuffer(value)
        ? value
        : Buffer.from(value, "utf8");
    if (buffer.length <= maxBytes) {
        return { text: buffer.toString("utf8"), truncated: false };
    }
    return {
        text: buffer.subarray(0, maxBytes).toString("utf8"),
        truncated: true,
    };
}

function errorCode(error: unknown): string | null {
    if (!error || typeof error !== "object") return null;
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" || typeof code === "number"
        ? String(code)
        : null;
}

function commandFailure(code: string | null): CommandResult {
    return {
        exitCode: null,
        signal: null,
        timedOut: false,
        stdout: "",
        stderr: "",
        errorCode: code,
        truncated: false,
    };
}

/** Create a shell-free command runner with bounded output and no logging. */
export function createCommandRunner(
    defaults: CommandOptions = {},
): CommandRunner {
    const defaultTimeoutMs = positiveInteger(
        defaults.timeoutMs,
        DEFAULT_TIMEOUT_MS,
    );
    const defaultMaxOutputBytes = positiveInteger(
        defaults.maxOutputBytes,
        DEFAULT_MAX_OUTPUT_BYTES,
    );

    return (command, args = [], options = {}) =>
        new Promise<CommandResult>((resolve) => {
            const timeoutMs = positiveInteger(
                options.timeoutMs,
                defaultTimeoutMs,
            );
            const maxOutputBytes = positiveInteger(
                options.maxOutputBytes,
                defaultMaxOutputBytes,
            );

            try {
                execFile(
                    command,
                    [...args],
                    {
                        cwd: options.cwd ?? defaults.cwd,
                        encoding: "utf8",
                        maxBuffer: maxOutputBytes,
                        shell: false,
                        timeout: timeoutMs,
                        windowsHide: true,
                    },
                    (error, stdout, stderr) => {
                        const stdoutResult = boundedOutput(
                            stdout,
                            maxOutputBytes,
                        );
                        const stderrResult = boundedOutput(
                            stderr,
                            maxOutputBytes,
                        );
                        const code = errorCode(error);
                        const numericExitCode =
                            error && typeof error.code === "number"
                                ? error.code
                                : error
                                  ? null
                                  : 0;

                        resolve({
                            exitCode: numericExitCode,
                            signal: error?.signal ?? null,
                            timedOut: error?.killed === true,
                            stdout: stdoutResult.text,
                            stderr: stderrResult.text,
                            errorCode: code,
                            truncated:
                                stdoutResult.truncated ||
                                stderrResult.truncated ||
                                code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
                        });
                    },
                );
            } catch (error) {
                resolve(commandFailure(errorCode(error)));
            }
        });
}

export const runCommand = createCommandRunner();
