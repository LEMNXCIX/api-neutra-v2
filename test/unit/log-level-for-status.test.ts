import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ForbiddenError,
    InvalidStateError,
    UnauthorizedError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { LogLevel, logLevelForStatus } from "@/core/providers/logger.interface";
import { httpStatusFromDomainError } from "@/types/error-codes";

/**
 * A 4xx is the caller's problem and the expected answer to a malformed or
 * unauthorised request, so it is a warning. A 5xx is ours and stays an error.
 * The cut is what makes an error-level dashboard trustworthy: before this rule
 * existed, a client sending a six-character password produced the same ERROR
 * line as an unmapped exception carrying a stack trace, and nothing in the
 * record distinguished them.
 */
describe("log level for a failed response", () => {
    test.each([
        [400, LogLevel.WARN],
        [401, LogLevel.WARN],
        [403, LogLevel.WARN],
        [404, LogLevel.WARN],
        [409, LogLevel.WARN],
        [422, LogLevel.WARN],
        [429, LogLevel.WARN],
    ])("%i is the caller's fault and logs at warn", (status, level) => {
        expect(logLevelForStatus(status)).toBe(level);
    });

    test.each([
        [500, LogLevel.ERROR],
        [502, LogLevel.ERROR],
        [503, LogLevel.ERROR],
    ])("%i is our fault and logs at error", (status, level) => {
        expect(logLevelForStatus(status)).toBe(level);
    });

    test("every domain error that maps to a client status logs at warn", () => {
        const clientErrors = [
            new ValidationError("invalid"),
            new UnauthorizedError(),
            new ForbiddenError(),
            new EntityNotFoundError("User", "1"),
            new InvalidStateError("bad state"),
            new BusinessRuleViolationError("rule"),
        ];
        for (const error of clientErrors) {
            const status = httpStatusFromDomainError(error);
            expect(status).toBeLessThan(500);
            expect(logLevelForStatus(status)).toBe(LogLevel.WARN);
        }
    });

    test("an unrecognised error class becomes 500 and so logs at error", () => {
        // The case that has to stay loud. httpStatusFromDomainError reports an
        // unknown class as a server fault, so the level rule keeps it at error
        // rather than demoting it to a warning with the other unmapped ones.
        const status = httpStatusFromDomainError({
            code: "ANYTHING",
            name: "Whatever",
        });
        expect(status).toBe(500);
        expect(logLevelForStatus(status)).toBe(LogLevel.ERROR);
    });

    test("a thrown Error, which the middleware reports as 500, logs at error", () => {
        // Not a domain error, so the error middleware assigns 500 by default
        // and keeps the stack. This is the shape of every unmapped failure:
        // a Prisma error, a bug, a failed library call.
        expect(logLevelForStatus(500)).toBe(LogLevel.ERROR);
    });
});
