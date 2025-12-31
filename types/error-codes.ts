/**
 * Standardized error codes for the application
 * Organized by domain/category for better error handling and client-side error display
 */

// Authentication & Authorization Errors (AUTH_*)
export enum AuthErrorCodes {
    INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
    MISSING_CREDENTIALS = 'AUTH_MISSING_CREDENTIALS',
    INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
    TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
    UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
    FORBIDDEN = 'AUTH_FORBIDDEN',
    SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
    // Added from middleware consolidation
    MISSING_TOKEN = 'AUTH_MISSING_TOKEN',
    INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
    PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',
    ACCOUNT_INACTIVE = 'AUTH_ACCOUNT_INACTIVE',
}

// Validation Errors (VALIDATION_*)
export enum ValidationErrorCodes {
    MISSING_REQUIRED_FIELDS = 'VALIDATION_MISSING_REQUIRED_FIELDS',
    INVALID_EMAIL = 'VALIDATION_INVALID_EMAIL',
    INVALID_PASSWORD = 'VALIDATION_INVALID_PASSWORD',
    INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
    INVALID_LENGTH = 'VALIDATION_INVALID_LENGTH',
    INVALID_ENUM_VALUE = 'VALIDATION_INVALID_ENUM_VALUE',
    INVALID_DATA_TYPE = 'VALIDATION_INVALID_DATA_TYPE',
}

// Resource Errors (RESOURCE_*)
export enum ResourceErrorCodes {
    NOT_FOUND = 'RESOURCE_NOT_FOUND',
    ROUTE_NOT_FOUND = 'RESOURCE_ROUTE_NOT_FOUND',
    ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
    CONFLICT = 'RESOURCE_CONFLICT',
    GONE = 'RESOURCE_GONE',
}

// Tenant Errors (TENANT_*)
export enum TenantErrorCodes {
    TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
    TENANT_INACTIVE = 'TENANT_INACTIVE',
    TENANT_SLUG_EXISTS = 'TENANT_SLUG_EXISTS',
    FEATURE_NOT_ENABLED = 'TENANT_FEATURE_NOT_ENABLED',
}

// Business Logic Errors (BUSINESS_*)
export enum BusinessErrorCodes {
    CART_EMPTY = 'BUSINESS_CART_EMPTY',
    INSUFFICIENT_STOCK = 'BUSINESS_INSUFFICIENT_STOCK',
    INVALID_QUANTITY = 'BUSINESS_INVALID_QUANTITY',
    ORDER_ALREADY_PROCESSED = 'BUSINESS_ORDER_ALREADY_PROCESSED',
    PAYMENT_FAILED = 'BUSINESS_PAYMENT_FAILED',
    INVALID_STATUS_TRANSITION = 'BUSINESS_INVALID_STATUS_TRANSITION',

    // Booking errors
    RESOURCE_NOT_FOUND = 'BUSINESS_RESOURCE_NOT_FOUND',
    RESOURCE_CONFLICT = 'BUSINESS_RESOURCE_CONFLICT',
    BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
}

// Database Errors (DB_*)
export enum DatabaseErrorCodes {
    CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
    TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
    CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
    UNIQUE_VIOLATION = 'DB_UNIQUE_VIOLATION',
    FOREIGN_KEY_VIOLATION = 'DB_FOREIGN_KEY_VIOLATION',
    TIMEOUT = 'DB_TIMEOUT',
}

// External Service Errors (EXTERNAL_*)
export enum ExternalServiceErrorCodes {
    THIRD_PARTY_UNAVAILABLE = 'EXTERNAL_THIRD_PARTY_UNAVAILABLE',
    THIRD_PARTY_TIMEOUT = 'EXTERNAL_THIRD_PARTY_TIMEOUT',
    THIRD_PARTY_ERROR = 'EXTERNAL_THIRD_PARTY_ERROR',
    PROVIDER_AUTH_FAILED = 'EXTERNAL_PROVIDER_AUTH_FAILED',
}

// System Errors (SYSTEM_*)
export enum SystemErrorCodes {
    INTERNAL_SERVER_ERROR = 'SYSTEM_INTERNAL_ERROR',
    NOT_IMPLEMENTED = 'SYSTEM_NOT_IMPLEMENTED',
    SERVICE_UNAVAILABLE = 'SYSTEM_SERVICE_UNAVAILABLE',
    UNKNOWN_ERROR = 'SYSTEM_UNKNOWN_ERROR',
}

// Rate Limiting Errors (RATE_LIMIT_*)
export enum RateLimitErrorCodes {
    TOO_MANY_REQUESTS = 'RATE_LIMIT_EXCEEDED',
    QUOTA_EXCEEDED = 'RATE_LIMIT_QUOTA_EXCEEDED',
}

/**
 * Combined type for all error codes
 */
export type ErrorCode =
    | AuthErrorCodes
    | ValidationErrorCodes
    | ResourceErrorCodes
    | TenantErrorCodes
    | BusinessErrorCodes
    | DatabaseErrorCodes
    | ExternalServiceErrorCodes
    | SystemErrorCodes
    | RateLimitErrorCodes
    | string; // Allow custom codes

/**
 * All error codes as a single object for easy access
 */
export const ErrorCodes = {
    ...AuthErrorCodes,
    ...ValidationErrorCodes,
    ...ResourceErrorCodes,
    ...TenantErrorCodes,
    ...BusinessErrorCodes,
    ...DatabaseErrorCodes,
    ...ExternalServiceErrorCodes,
    ...SystemErrorCodes,
    ...RateLimitErrorCodes,
} as const;

/**
 * Helper to get HTTP status code from error code
 */
export function getHttpStatusFromErrorCode(errorCode: ErrorCode): number {
    // Auth errors -> 401
    if (errorCode.startsWith('AUTH_')) {
        if (errorCode === AuthErrorCodes.FORBIDDEN) return 403;
        return 401;
    }

    // Validation errors -> 400
    if (errorCode.startsWith('VALIDATION_')) {
        return 400;
    }

    // Resource errors
    if (errorCode.startsWith('RESOURCE_')) {
        if (errorCode === ResourceErrorCodes.NOT_FOUND) return 404;
        if (errorCode === ResourceErrorCodes.ROUTE_NOT_FOUND) return 404;
        if (errorCode === ResourceErrorCodes.ALREADY_EXISTS) return 409;
        if (errorCode === ResourceErrorCodes.CONFLICT) return 409;
        if (errorCode === ResourceErrorCodes.GONE) return 410;
        return 400;
    }

    // Tenant errors
    if (errorCode.startsWith('TENANT_')) {
        if (errorCode === 'TENANT_NOT_FOUND') return 404;
        if (errorCode === 'TENANT_INACTIVE') return 403;
        return 400;
    }

    // Business logic errors -> 422
    if (errorCode.startsWith('BUSINESS_')) {
        return 422;
    }

    // Database errors -> 500
    if (errorCode.startsWith('DB_')) {
        return 500;
    }

    // External service errors -> 502 or 503
    if (errorCode.startsWith('EXTERNAL_')) {
        return 502;
    }

    // Rate limiting -> 429
    if (errorCode.startsWith('RATE_LIMIT_')) {
        return 429;
    }

    // Default to 500 for unknown/system errors
    return 500;
}
