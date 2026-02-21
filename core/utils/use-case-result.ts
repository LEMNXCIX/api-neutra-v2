
import { ErrorCode } from '@/types/error-codes';

/**
 * Clean UseCaseResult without HTTP infrastructure concerns.
 */
export interface UseCaseResult<T = any> {
    success: boolean;
    message: string;
    data?: T;
    // For expected validation errors that don't necessarily throw immediately
    errors?: Array<{
        code: ErrorCode;
        message: string;
        field?: string;
    }>;
}

/**
 * Success helper for Use Cases
 */
export const Success = <T>(data?: T, message: string = ''): UseCaseResult<T> => ({
    success: true,
    message,
    data
});
