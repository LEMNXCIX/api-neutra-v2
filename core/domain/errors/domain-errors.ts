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
        super(`${entity} with id '${id}' not found`, "ENTITY_NOT_FOUND");
    }
}

export class BusinessRuleViolationError extends DomainError {
    constructor(message: string, code: string = "BUSINESS_RULE_VIOLATION") {
        super(message, code);
    }
}

export class InvalidStateError extends DomainError {
    constructor(message: string, code: string = "INVALID_STATE") {
        super(message, code);
    }
}

export class DuplicateEntityError extends DomainError {
    constructor(entity: string, field: string, value: string) {
        super(
            `${entity} with ${field} '${value}' already exists`,
            "DUPLICATE_ENTITY",
        );
    }
}

export class ValidationError extends DomainError {
    constructor(message: string, code: string = "VALIDATION_ERROR") {
        super(message, code);
    }
}

export class UnauthorizedError extends DomainError {
    constructor(
        message: string = "Unauthorized",
        code: string = "UNAUTHORIZED",
    ) {
        super(message, code);
    }
}

export class ForbiddenError extends DomainError {
    constructor(message: string = "Forbidden", code: string = "FORBIDDEN") {
        super(message, code);
    }
}
