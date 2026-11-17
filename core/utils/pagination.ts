/** Defaults and ceiling shared by every paginated list endpoint. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export interface PaginationInput {
    page?: unknown;
    limit?: unknown;
}

export interface Pagination {
    page: number;
    limit: number;
}

function positiveInt(value: unknown, fallback: number, max?: number): number {
    if (value === undefined || value === null || value === "") return fallback;
    // Express can produce string[] when a param is repeated.
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return max === undefined ? parsed : Math.min(parsed, max);
}

/**
 * Parses page/limit from an untrusted query object without ever yielding NaN
 * or an unbounded limit. This helper itself never rejects input: it falls
 * back to the defaults so callers get a usable page even from a stale link.
 * Endpoints that add a query DTO may reject malformed input earlier with a
 * 400 — that validation is a separate, deliberate contract decision.
 */
export function parsePagination(
    input: PaginationInput,
    options: { defaultLimit?: number } = {},
): Pagination {
    return {
        page: positiveInt(input.page, DEFAULT_PAGE),
        limit: positiveInt(
            input.limit,
            options.defaultLimit ?? DEFAULT_LIMIT,
            MAX_LIMIT,
        ),
    };
}
