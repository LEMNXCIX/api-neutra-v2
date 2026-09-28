import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ForbiddenError,
    InvalidStateError,
    UnauthorizedError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import {
    BusinessErrorCodes,
    httpStatusFromDomainError,
} from "@/types/error-codes";

describe("Domain error → HTTP mapping", () => {
    test("maps by error class even with custom codes", () => {
        expect(
            httpStatusFromDomainError(
                new BusinessRuleViolationError(
                    "empty",
                    BusinessErrorCodes.CART_EMPTY,
                ),
            ),
        ).toBe(422);
        expect(
            httpStatusFromDomainError(
                new BusinessRuleViolationError(
                    "stock",
                    BusinessErrorCodes.INSUFFICIENT_STOCK,
                ),
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
        expect(httpStatusFromDomainError(new ValidationError("invalid"))).toBe(
            400,
        );
    });

    test("reports an unrecognised error class as a server fault", () => {
        // Unreachable from production, where every caller guards on
        // `instanceof DomainError`. Pinned so the fallback is not silently
        // changed into a client error.
        expect(
            httpStatusFromDomainError({ code: "ANYTHING", name: "Whatever" }),
        ).toBe(500);
    });
});
