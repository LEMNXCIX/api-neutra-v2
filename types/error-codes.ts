/**
 * Standardized error codes for the application
 * Organized by domain/category for better error handling and client-side error display
 */

// Authentication & Authorization Errors (AUTH_*)
export enum AuthErrorCodes {
    INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
    MISSING_CREDENTIALS = "AUTH_MISSING_CREDENTIALS",
    INVALID_TOKEN = "AUTH_INVALID_TOKEN",
    TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
    UNAUTHORIZED = "AUTH_UNAUTHORIZED",
    FORBIDDEN = "AUTH_FORBIDDEN",
    SESSION_EXPIRED = "AUTH_SESSION_EXPIRED",
    // Added from middleware consolidation
    MISSING_TOKEN = "AUTH_MISSING_TOKEN",
    INSUFFICIENT_PERMISSIONS = "AUTH_INSUFFICIENT_PERMISSIONS",
    PERMISSION_DENIED = "AUTH_PERMISSION_DENIED",
    ACCOUNT_INACTIVE = "AUTH_ACCOUNT_INACTIVE",
}

// Validation Errors (VALIDATION_*)
export enum ValidationErrorCodes {
    MISSING_REQUIRED_FIELDS = "VALIDATION_MISSING_REQUIRED_FIELDS",
    INVALID_EMAIL = "VALIDATION_INVALID_EMAIL",
    INVALID_PASSWORD = "VALIDATION_INVALID_PASSWORD",
    INVALID_FORMAT = "VALIDATION_INVALID_FORMAT",
    INVALID_LENGTH = "VALIDATION_INVALID_LENGTH",
    INVALID_ENUM_VALUE = "VALIDATION_INVALID_ENUM_VALUE",
    INVALID_DATA_TYPE = "VALIDATION_INVALID_DATA_TYPE",
}

// Resource Errors (RESOURCE_*)
export enum ResourceErrorCodes {
    NOT_FOUND = "RESOURCE_NOT_FOUND",
    ROUTE_NOT_FOUND = "RESOURCE_ROUTE_NOT_FOUND",
    ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
    CONFLICT = "RESOURCE_CONFLICT",
    GONE = "RESOURCE_GONE",
}

// Tenant Errors (TENANT_*)
export enum TenantErrorCodes {
    TENANT_REQUIRED = "TENANT_REQUIRED",
    TENANT_NOT_FOUND = "TENANT_NOT_FOUND",
    TENANT_INACTIVE = "TENANT_INACTIVE",
    TENANT_SLUG_EXISTS = "TENANT_SLUG_EXISTS",
    FEATURE_NOT_ENABLED = "TENANT_FEATURE_NOT_ENABLED",
}

// Business Logic Errors (BUSINESS_*)
export enum BusinessErrorCodes {
    CART_EMPTY = "BUSINESS_CART_EMPTY",
    INSUFFICIENT_STOCK = "BUSINESS_INSUFFICIENT_STOCK",
    INVALID_QUANTITY = "BUSINESS_INVALID_QUANTITY",
    ORDER_ALREADY_PROCESSED = "BUSINESS_ORDER_ALREADY_PROCESSED",
    PAYMENT_FAILED = "BUSINESS_PAYMENT_FAILED",
    INVALID_STATUS_TRANSITION = "BUSINESS_INVALID_STATUS_TRANSITION",

    // Booking errors
    RESOURCE_NOT_FOUND = "BUSINESS_RESOURCE_NOT_FOUND",
    RESOURCE_CONFLICT = "BUSINESS_RESOURCE_CONFLICT",
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
}

// Database Errors (DB_*)
export enum DatabaseErrorCodes {
    CONNECTION_FAILED = "DB_CONNECTION_FAILED",
    TRANSACTION_FAILED = "DB_TRANSACTION_FAILED",
    CONSTRAINT_VIOLATION = "DB_CONSTRAINT_VIOLATION",
    UNIQUE_VIOLATION = "DB_UNIQUE_VIOLATION",
    FOREIGN_KEY_VIOLATION = "DB_FOREIGN_KEY_VIOLATION",
    TIMEOUT = "DB_TIMEOUT",
}

// External Service Errors (EXTERNAL_*)
export enum ExternalServiceErrorCodes {
    THIRD_PARTY_UNAVAILABLE = "EXTERNAL_THIRD_PARTY_UNAVAILABLE",
    THIRD_PARTY_TIMEOUT = "EXTERNAL_THIRD_PARTY_TIMEOUT",
    THIRD_PARTY_ERROR = "EXTERNAL_THIRD_PARTY_ERROR",
    PROVIDER_AUTH_FAILED = "EXTERNAL_PROVIDER_AUTH_FAILED",
}

// System Errors (SYSTEM_*)
export enum SystemErrorCodes {
    INTERNAL_SERVER_ERROR = "SYSTEM_INTERNAL_ERROR",
    NOT_IMPLEMENTED = "SYSTEM_NOT_IMPLEMENTED",
    SERVICE_UNAVAILABLE = "SYSTEM_SERVICE_UNAVAILABLE",
    UNKNOWN_ERROR = "SYSTEM_UNKNOWN_ERROR",
}

// Rate Limiting Errors (RATE_LIMIT_*)
export enum RateLimitErrorCodes {
    TOO_MANY_REQUESTS = "RATE_LIMIT_EXCEEDED",
    QUOTA_EXCEEDED = "RATE_LIMIT_QUOTA_EXCEEDED",
}

// WhatsApp Errors (WHATSAPP_*)
export enum WhatsAppErrorCodes {
    WHATSAPP_CONFIG_NOT_FOUND = "WHATSAPP_CONFIG_NOT_FOUND",
    WHATSAPP_MESSAGE_FAILED = "WHATSAPP_MESSAGE_FAILED",
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
    ...WhatsAppErrorCodes,
} as const;

const DOMAIN_CODE_TO_HTTP: Record<string, number> = {
    ENTITY_NOT_FOUND: 404,
    BUSINESS_RULE_VIOLATION: 422,
    INVALID_STATE: 409,
    DUPLICATE_ENTITY: 409,
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    // Custom codes used with BusinessRuleViolationError (must keep 422)
    CART_EMPTY: 422,
    INSUFFICIENT_STOCK: 422,
    // Custom code used as business rule in social-login (legacy)
    TENANT_NOT_FOUND: 404,
};

/**
 * Map domain semantic code → HTTP status.
 * Prefer {@link httpStatusFromDomainError} when the error instance is available
 * (custom codes like CART_EMPTY still map via class hierarchy).
 */
export function httpStatusFromDomainCode(code: string): number {
    return DOMAIN_CODE_TO_HTTP[code] ?? 400;
}

/**
 * Prefer class hierarchy so custom codes on BusinessRuleViolationError /
 * InvalidStateError / etc. keep the correct HTTP status (422, 409, …).
 */
export function httpStatusFromDomainError(error: {
    code: string;
    name?: string;
}): number {
    switch (error.name) {
        case "EntityNotFoundError":
            return 404;
        case "BusinessRuleViolationError":
            return 422;
        case "InvalidStateError":
        case "DuplicateEntityError":
            return 409;
        case "UnauthorizedError":
            return 401;
        case "ForbiddenError":
            return 403;
        case "ValidationError":
            return 400;
        default:
            return httpStatusFromDomainCode(error.code);
    }
}

/**
 * Helper to get HTTP status code from error code
 */
export function getHttpStatusFromErrorCode(errorCode: ErrorCode): number {
    // Auth errors -> 401
    if (errorCode.startsWith("AUTH_")) {
        if (errorCode === AuthErrorCodes.FORBIDDEN) return 403;
        return 401;
    }

    // Validation errors -> 400
    if (errorCode.startsWith("VALIDATION_")) {
        return 400;
    }

    // Resource errors
    if (errorCode.startsWith("RESOURCE_")) {
        if (errorCode === ResourceErrorCodes.NOT_FOUND) return 404;
        if (errorCode === ResourceErrorCodes.ROUTE_NOT_FOUND) return 404;
        if (errorCode === ResourceErrorCodes.ALREADY_EXISTS) return 409;
        if (errorCode === ResourceErrorCodes.CONFLICT) return 409;
        if (errorCode === ResourceErrorCodes.GONE) return 410;
        return 400;
    }

    // Tenant errors
    if (errorCode.startsWith("TENANT_")) {
        if (errorCode === "TENANT_NOT_FOUND") return 404;
        if (errorCode === "TENANT_INACTIVE") return 403;
        return 400;
    }

    // Business logic errors -> 422
    if (errorCode.startsWith("BUSINESS_")) {
        return 422;
    }

    // Database errors -> 500
    if (errorCode.startsWith("DB_")) {
        return 500;
    }

    // External service errors -> 502 or 503
    if (errorCode.startsWith("EXTERNAL_")) {
        return 502;
    }

    // Rate limiting -> 429
    if (errorCode.startsWith("RATE_LIMIT_")) {
        return 429;
    }

    // WhatsApp errors
    if (errorCode.startsWith("WHATSAPP_")) {
        if (errorCode === WhatsAppErrorCodes.WHATSAPP_CONFIG_NOT_FOUND)
            return 404;
        return 502;
    }

    // Default to 500 for unknown/system errors
    return 500;
}
