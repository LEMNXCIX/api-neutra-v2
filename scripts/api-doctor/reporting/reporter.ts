import type {
    CheckResult,
    DoctorReport,
} from "../domain/check-result";

export type ReportFormat = "text" | "json" | "sarif";

function sarifLevel(status: CheckResult["status"]): string {
    if (status === "FAIL") return "error";
    if (status === "WARN") return "warning";
    return "none";
}

export function renderTextReport(report: DoctorReport): string {
    const lines = [
        "API Doctor",
        `Profile: ${report.profile}`,
        `Status: ${report.status}`,
        `Exit code: ${report.exitCode}`,
        "",
        "Checks:",
    ];

    if (report.checks.length === 0) {
        lines.push("  (none)");
    }

    for (const check of report.checks) {
        const blocking = check.blocking ? " [blocking]" : "";
        lines.push(
            `  [${check.status}] ${check.id} (${check.category})${blocking}`,
            `    ${check.message}`,
        );
        for (const detail of check.details ?? []) {
            lines.push(`    - ${detail}`);
        }
    }

    const counts = {
        pass: report.checks.filter((check) => check.status === "PASS").length,
        warn: report.checks.filter((check) => check.status === "WARN").length,
        fail: report.checks.filter((check) => check.status === "FAIL").length,
        skip: report.checks.filter((check) => check.status === "SKIP").length,
    };
    lines.push(
        "",
        `Summary: ${counts.pass} passed, ${counts.warn} warned, ${counts.fail} failed, ${counts.skip} skipped`,
    );

    return `${lines.join("\n")}\n`;
}

export function renderJsonReport(report: DoctorReport): string {
    return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderSarifReport(report: DoctorReport): string {
    const sarif = {
        $schema:
            "https://json.schemastore.org/sarif-2.1.0.json",
        version: "2.1.0",
        runs: [
            {
                tool: {
                    driver: {
                        name: "api-doctor",
                        rules: report.checks.map((check) => ({
                            id: check.id,
                            name: check.id,
                            shortDescription: { text: check.message },
                            defaultConfiguration: {
                                level: sarifLevel(check.status),
                            },
                            properties: {
                                category: check.category,
                                blocking: check.blocking,
                                status: check.status,
                                details: check.details ?? [],
                            },
                        })),
                    },
                },
                results: report.checks.map((check) => ({
                    ruleId: check.id,
                    level: sarifLevel(check.status),
                    message: { text: check.message },
                    properties: {
                        category: check.category,
                        blocking: check.blocking,
                        status: check.status,
                        details: check.details ?? [],
                    },
                })),
            },
        ],
    };

    return `${JSON.stringify(sarif, null, 2)}\n`;
}

export function renderReport(
    report: DoctorReport,
    format: ReportFormat = "text",
): string {
    switch (format) {
        case "text":
            return renderTextReport(report);
        case "json":
            return renderJsonReport(report);
        case "sarif":
            return renderSarifReport(report);
        default:
            throw new Error(`Unsupported report format: ${format}`);
    }
}

export const formatTextReport = renderTextReport;
export const formatJsonReport = renderJsonReport;
export const formatSarifReport = renderSarifReport;
