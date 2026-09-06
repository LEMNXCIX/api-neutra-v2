/**
 * Clean UseCaseResult without HTTP infrastructure concerns.
 */
export interface UseCaseResult<T = any> {
    success: boolean;
    message: string;
    data?: T;
    /** Optional response metadata (e.g. pagination) */
    meta?: Record<string, unknown>;
    // For expected validation errors that don't necessarily throw immediately
    errors?: Array<{
        code: string;
        message: string;
        field?: string;
    }>;
}

/**
 * Success helper for Use Cases
 */
export const Success = <T>(
    data?: T,
    message: string = "",
    meta?: Record<string, unknown>,
): UseCaseResult<T> => ({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
});

export const present = <T, R>(
    result: UseCaseResult<T>,
    presenter: (data: T) => R,
): UseCaseResult<R> => ({
    success: result.success,
    message: result.message,
    ...(result.success && result.data !== undefined
        ? { data: presenter(result.data) }
        : {}),
    ...(result.meta ? { meta: result.meta } : {}),
    ...(!result.success && result.errors ? { errors: result.errors } : {}),
});
