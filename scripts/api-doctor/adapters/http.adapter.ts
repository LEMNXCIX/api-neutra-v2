import type {
    CheckRunResult,
    DoctorContext,
} from "../domain/check-result";

type FetchImplementation = typeof fetch;

const HTTP_TIMEOUT_MS = 5_000;

function buildEndpointUrl(
    runtimeUrl: string,
    endpoint: "/health" | "/ready",
): string | null {
    try {
        const url = new URL(runtimeUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return null;
        }
        const basePath = url.pathname.replace(/\/$/, "");
        url.pathname = `${basePath}${endpoint}`;
        url.search = "";
        url.hash = "";
        return url.toString();
    } catch {
        return null;
    }
}

async function fetchWithTimeout(
    fetchImplementation: FetchImplementation,
    url: string,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    try {
        return await fetchImplementation(url, {
            method: "GET",
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }
}

function failureForProfile(
    context: DoctorContext,
    endpoint: "/health" | "/ready",
): CheckRunResult {
    return {
        status: context.profile === "full" ? "FAIL" : "WARN",
        message: `Runtime ${endpoint} check did not pass`,
    };
}

/** Build a native-fetch check for one public runtime endpoint. */
export function createRuntimeEndpointCheck(
    endpoint: "/health" | "/ready",
    fetchImplementation: FetchImplementation = fetch,
): (context: DoctorContext) => Promise<CheckRunResult> {
    return async (context) => {
        if (!context.runtimeUrl) {
            return {
                status: "SKIP",
                message: `Runtime URL is not configured for ${endpoint}`,
            };
        }
        const url = buildEndpointUrl(context.runtimeUrl, endpoint);
        if (!url) {
            return {
                status: "WARN",
                message: `Runtime URL is invalid for ${endpoint}`,
            };
        }

        try {
            const response = await fetchWithTimeout(fetchImplementation, url);
            if (response.status >= 200 && response.status < 300) {
                return {
                    status: "PASS",
                    message: `Runtime ${endpoint} responded successfully`,
                };
            }
            return failureForProfile(context, endpoint);
        } catch {
            return failureForProfile(context, endpoint);
        }
    };
}

export const checkRuntimeHealth = createRuntimeEndpointCheck("/health");
export const checkRuntimeReady = createRuntimeEndpointCheck("/ready");
