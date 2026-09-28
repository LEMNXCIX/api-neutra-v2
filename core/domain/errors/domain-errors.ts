import {
    AuthErrorCodes,
    BusinessErrorCodes,
    ResourceErrorCodes,
    ValidationErrorCodes,
} from "@/types/error-codes";

export class DomainError extends Error {
    constructor(
        message: string,
        public readonly code: string,
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class EntityNotFoundError extends DomainError {
    constructor(entity: string, id: string) {
        super(
            `${entity} with id '${id}' not found`,
            ResourceErrorCodes.NOT_FOUND,
        );
    }
}

export class BusinessRuleViolationError extends DomainError {
    constructor(
        message: string,
        code: string = BusinessErrorCodes.BUSINESS_RULE_VIOLATION,
    ) {
        super(message, code);
    }
}

export class InvalidStateError extends DomainError {
    constructor(
        message: string,
        code: string = ResourceErrorCodes.INVALID_STATE,
    ) {
        super(message, code);
    }
}

export class DuplicateEntityError extends DomainError {
    constructor(entity: string, field: string, value: string) {
        super(
            `${entity} with ${field} '${value}' already exists`,
            ResourceErrorCodes.ALREADY_EXISTS,
        );
    }
}

export class ValidationError extends DomainError {
    constructor(
        message: string,
        code: string = ValidationErrorCodes.VALIDATION_ERROR,
    ) {
        super(message, code);
    }
}

export class UnauthorizedError extends DomainError {
    constructor(
        message: string = "Unauthorized",
        code: string = AuthErrorCodes.UNAUTHORIZED,
    ) {
        super(message, code);
    }
}

export class ForbiddenError extends DomainError {
    constructor(
        message: string = "Forbidden",
        code: string = AuthErrorCodes.FORBIDDEN,
    ) {
        super(message, code);
    }
}
