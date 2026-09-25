export type CheckStatus = "PASS" | "WARN" | "FAIL" | "SKIP";

export type CheckCategory =
    | "configuration"
    | "static"
    | "runtime"
    | "security"
    | "deployment";

export type DoctorProfile = "default" | "ci" | "full";

export type OverallStatus = "PASS" | "WARN" | "FAIL";

export interface CheckResult {
    id: string;
    category: CheckCategory;
    status: CheckStatus;
    blocking: boolean;
    message: string;
    details?: string[];
}

export type CheckRunResult = Omit<CheckResult, "id" | "category" | "blocking">;

export interface DoctorContext {
    rootDir: string;
    profile: DoctorProfile;
    runtimeUrl?: string;
    includeIntegration: boolean;
    hasEnvKey: (key: string) => boolean;
}

export interface DoctorCheck {
    id: string;
    category: CheckCategory;
    enabledIn: readonly DoctorProfile[];
    blockingIn: readonly DoctorProfile[];
    run: (context: DoctorContext) => Promise<CheckRunResult>;
}

export interface DoctorReport {
    schemaVersion: 1;
    profile: DoctorProfile;
    status: OverallStatus;
    checks: CheckResult[];
    exitCode: 0 | 1;
}
