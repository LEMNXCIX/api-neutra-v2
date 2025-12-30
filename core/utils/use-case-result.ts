export interface UseCaseResult<T = any> {
    success: boolean;
    code: number;
    message: string;
    data?: T;
    errors?: Array<{
        code: string;
        message: string;
    }>;
}
