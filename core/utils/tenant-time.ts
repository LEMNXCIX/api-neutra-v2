function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidTimezone(value: unknown): value is string {
    if (typeof value !== "string" || value.trim().length === 0) return false;

    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
        return true;
    } catch {
        return false;
    }
}

export function extractTenantTimezone(config: unknown): string | null {
    if (!isRecord(config) || !isRecord(config.settings)) return null;

    const timezone = config.settings.timezone;
    return isValidTimezone(timezone) ? timezone : null;
}

export function getTimezoneOrUtc(timezone: string | null): string {
    return isValidTimezone(timezone) ? timezone : "UTC";
}

export function formatInstantInTenantTimezone(
    instant: Date,
    timezone: string | null,
): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: getTimezoneOrUtc(timezone),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
        timeZoneName: "shortOffset",
    }).format(instant);
}
