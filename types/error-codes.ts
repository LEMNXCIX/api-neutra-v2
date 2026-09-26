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
    USER_ALREADY_EXISTS = "AUTH_USER_ALREADY_EXISTS",
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
    /** Default code of the `ValidationError` constructor. */
    VALIDATION_ERROR = "VALIDATION_ERROR",

    // Loyalty campaign validation
    INVALID_CAMPAIGN = "VALIDATION_INVALID_CAMPAIGN",
    INVALID_CAMPAIGN_NAME = "VALIDATION_INVALID_CAMPAIGN_NAME",
    INVALID_CAMPAIGN_DATE = "VALIDATION_INVALID_CAMPAIGN_DATE",
    INVALID_CAMPAIGN_DATES = "VALIDATION_INVALID_CAMPAIGN_DATES",
    INVALID_CAMPAIGN_SOURCE = "VALIDATION_INVALID_CAMPAIGN_SOURCE",
    INVALID_CAMPAIGN_TARGET = "VALIDATION_INVALID_CAMPAIGN_TARGET",
    INVALID_CAMPAIGN_MAX_CLAIMS = "VALIDATION_INVALID_CAMPAIGN_MAX_CLAIMS",
    INVALID_LOYALTY_CAMPAIGN_ACTION = "VALIDATION_INVALID_LOYALTY_CAMPAIGN_ACTION",
    INVALID_LOYALTY_REWARD_VALIDITY = "VALIDATION_INVALID_LOYALTY_REWARD_VALIDITY",
    INVALID_LOYALTY_SOURCE_TYPE = "VALIDATION_INVALID_LOYALTY_SOURCE_TYPE",
}

// Resource Errors (RESOURCE_*)
export enum ResourceErrorCodes {
    NOT_FOUND = "RESOURCE_NOT_FOUND",
    ROUTE_NOT_FOUND = "RESOURCE_ROUTE_NOT_FOUND",
    ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
    CONFLICT = "RESOURCE_CONFLICT",
    GONE = "RESOURCE_GONE",
    /** Default code of the `InvalidStateError` constructor. */
    INVALID_STATE = "RESOURCE_INVALID_STATE",
}

// Tenant Errors (TENANT_*)
export enum TenantErrorCodes {
    TENANT_REQUIRED = "TENANT_REQUIRED",
    TENANT_NOT_FOUND = "TENANT_NOT_FOUND",
    TENANT_INACTIVE = "TENANT_INACTIVE",
    TENANT_SLUG_EXISTS = "TENANT_SLUG_EXISTS",
    FEATURE_NOT_ENABLED = "TENANT_FEATURE_NOT_ENABLED",
    TYPE_NOT_ALLOWED = "TENANT_TYPE_NOT_ALLOWED",
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
    INVALID_APPOINTMENT_STATUS = "BUSINESS_INVALID_APPOINTMENT_STATUS",
    APPOINTMENT_STATUS_CONFLICT = "BUSINESS_APPOINTMENT_STATUS_CONFLICT",
    ORDER_STATUS_CONFLICT = "BUSINESS_ORDER_STATUS_CONFLICT",
    START_TIME_NOT_IN_FUTURE = "BUSINESS_START_TIME_NOT_IN_FUTURE",
    HOLIDAY_CLOSED = "BUSINESS_HOLIDAY_CLOSED",
    OUTSIDE_WORKING_HOURS = "BUSINESS_OUTSIDE_WORKING_HOURS",

    // Coupon errors
    INVALID_COUPON = "BUSINESS_INVALID_COUPON",
    COUPON_UNAVAILABLE = "BUSINESS_COUPON_UNAVAILABLE",
    COUPON_NOT_OWNED = "BUSINESS_COUPON_NOT_OWNED",
    REWARD_COUPON_NOT_OWNED = "BUSINESS_REWARD_COUPON_NOT_OWNED",

    // Tenant feature gates
    COUPONS_FEATURE_REQUIRED = "BUSINESS_COUPONS_FEATURE_REQUIRED",
    LOYALTY_FEATURE_REQUIRED = "BUSINESS_LOYALTY_FEATURE_REQUIRED",
    LOYALTY_REQUIRES_COUPONS = "BUSINESS_LOYALTY_REQUIRES_COUPONS",
    LOYALTY_OBLIGATIONS_EXIST = "BUSINESS_LOYALTY_OBLIGATIONS_EXIST",

    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
}

/**
 * Loyalty campaign and reward errors (LOYALTY_*)
 */
export enum LoyaltyErrorCodes {
    TEMPLATE_NOT_REDEEMABLE = "LOYALTY_TEMPLATE_NOT_REDEEMABLE",
    /**
     * Wire value kept as shipped. Renaming it to the `LOYALTY_` prefix order
     * is a breaking change for clients, so it stays until one is agreed.
     */
    INVALID_REWARD_TEMPLATE = "INVALID_LOYALTY_REWARD_TEMPLATE",
    CAMPAIGN_SOURCE_NOT_COMPATIBLE = "LOYALTY_CAMPAIGN_SOURCE_NOT_COMPATIBLE",
    CAMPAIGN_TRANSITION_CONFLICT = "LOYALTY_CAMPAIGN_TRANSITION_CONFLICT",
    INVALID_CAMPAIGN_TRANSITION = "LOYALTY_INVALID_CAMPAIGN_TRANSITION",
    CAMPAIGN_ARCHIVE_TOO_EARLY = "LOYALTY_CAMPAIGN_ARCHIVE_TOO_EARLY",
    CAMPAIGN_NOT_CLAIMABLE = "LOYALTY_CAMPAIGN_NOT_CLAIMABLE",
    CAMPAIGN_CLAIM_LIMIT_REACHED = "LOYALTY_CAMPAIGN_CLAIM_LIMIT_REACHED",
    CAMPAIGN_NOT_DRAFT = "LOYALTY_CAMPAIGN_NOT_DRAFT",
    TARGET_NOT_REACHED = "LOYALTY_TARGET_NOT_REACHED",
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
    | LoyaltyErrorCodes
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
    ...LoyaltyErrorCodes,
    ...DatabaseErrorCodes,
    ...ExternalServiceErrorCodes,
    ...SystemErrorCodes,
    ...RateLimitErrorCodes,
    ...WhatsAppErrorCodes,
} as const;

/**
 * Prefer class hierarchy so custom codes on BusinessRuleViolationError /
 * InvalidStateError / etc. keep the correct HTTP status (422, 409, …).
 *
 * Resolution is by error class, never by the code. Every DomainError subclass
 * appears in the switch below, so a custom code on a known class still resolves
 * correctly. An earlier version fell through to a code-keyed map for
 * unrecognised classes, but every production caller guards on
 * `instanceof DomainError`, so that path was unreachable and the map's
 * unprefixed keys were dead weight a reader could mistake for live behaviour.
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
            // Unreachable from production: every caller guards on
            // `instanceof DomainError` and all seven subclasses are listed
            // above. An unrecognised class name is a server-side surprise, so
            // it is reported as such rather than as a client error.
            return 500;
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
