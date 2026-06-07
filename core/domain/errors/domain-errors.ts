export class DomainError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 400,
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class EntityNotFoundError extends DomainError {
    constructor(entity: string, id: string) {
        super(`${entity} with id '${id}' not found`, "ENTITY_NOT_FOUND", 404);
        this.name = "EntityNotFoundError";
    }
}

export class BusinessRuleViolationError extends DomainError {
    constructor(message: string, code: string = "BUSINESS_RULE_VIOLATION") {
        super(message, code, 422);
        this.name = "BusinessRuleViolationError";
    }
}

export class InvalidStateError extends DomainError {
    constructor(message: string, code: string = "INVALID_STATE") {
        super(message, code, 409);
        this.name = "InvalidStateError";
    }
}

export class DuplicateEntityError extends DomainError {
    constructor(entity: string, field: string, value: string) {
        super(
            `${entity} with ${field} '${value}' already exists`,
            "DUPLICATE_ENTITY",
            409,
        );
        this.name = "DuplicateEntityError";
    }
}

export class ValidationError extends DomainError {
    constructor(message: string, code: string = "VALIDATION_ERROR") {
        super(message, code, 400);
        this.name = "ValidationError";
    }
}

export class UnauthorizedError extends DomainError {
    constructor(
        message: string = "Unauthorized",
        code: string = "UNAUTHORIZED",
    ) {
        super(message, code, 401);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends DomainError {
    constructor(message: string = "Forbidden", code: string = "FORBIDDEN") {
        super(message, code, 403);
        this.name = "ForbiddenError";
    }
}
