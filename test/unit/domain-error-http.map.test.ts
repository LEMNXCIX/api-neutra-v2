import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ForbiddenError,
    InvalidStateError,
    UnauthorizedError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import {
    httpStatusFromDomainCode,
    httpStatusFromDomainError,
} from "@/types/error-codes";

describe("Domain error → HTTP mapping", () => {
    test("maps by error class even with custom codes", () => {
        expect(
            httpStatusFromDomainError(
                new BusinessRuleViolationError("empty", "CART_EMPTY"),
            ),
        ).toBe(422);
        expect(
            httpStatusFromDomainError(
                new BusinessRuleViolationError("stock", "INSUFFICIENT_STOCK"),
            ),
        ).toBe(422);
        expect(
            httpStatusFromDomainError(new EntityNotFoundError("User", "1")),
        ).toBe(404);
        expect(
            httpStatusFromDomainError(new InvalidStateError("bad state")),
        ).toBe(409);
        expect(httpStatusFromDomainError(new UnauthorizedError())).toBe(401);
        expect(httpStatusFromDomainError(new ForbiddenError())).toBe(403);
        expect(
            httpStatusFromDomainError(new ValidationError("invalid")),
        ).toBe(400);
    });

    test("code map covers default domain codes", () => {
        expect(httpStatusFromDomainCode("ENTITY_NOT_FOUND")).toBe(404);
        expect(httpStatusFromDomainCode("BUSINESS_RULE_VIOLATION")).toBe(422);
        expect(httpStatusFromDomainCode("CART_EMPTY")).toBe(422);
        expect(httpStatusFromDomainCode("UNKNOWN_CODE")).toBe(400);
    });
});
