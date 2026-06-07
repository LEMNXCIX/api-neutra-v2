/**
 * Clean UseCaseResult without HTTP infrastructure concerns.
 */
export interface UseCaseResult<T = any> {
    success: boolean;
    message: string;
    data?: T;
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
): UseCaseResult<T> => ({
    success: true,
    message,
    data,
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
    ...(!result.success && result.errors ? { errors: result.errors } : {}),
});
