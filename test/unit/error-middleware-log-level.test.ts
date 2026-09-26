import { createErrorMiddleware } from "@/middleware/error.middleware";
import { ValidationError } from "@/core/domain/errors/domain-errors";
import type { ILogger } from "@/core/providers/logger.interface";

/**
 * The rule under test: a 4xx reaches the client as a warning, and anything the
 * code did not map — which becomes a 500 and keeps its stack — reaches the log
 * as an error. What matters operationally is that an error-level dashboard can
 * be trusted to contain only faults on this side, so these assert the call the
 * middleware actually makes rather than the helper in isolation.
 */
function fakeLogger() {
    return {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        logRequest: jest.fn(),
        logResponse: jest.fn(),
    } satisfies ILogger;
}

function fakeRes() {
    const res = {
        statusCode: 200,
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        json(body: unknown) {
            return body;
        },
    };
    return res;
}

function fakeReq(traceId = "trace-1") {
    return { traceId } as never;
}

describe("global error middleware log level", () => {
    test("a 4xx is a warning, not an error", () => {
        const logger = fakeLogger();
        const middleware = createErrorMiddleware(logger);

        middleware(
            new ValidationError("invalid"),
            fakeReq(),
            fakeRes() as never,
            jest.fn(),
        );

        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.error).not.toHaveBeenCalled();
        // `warn(message, metadata?, options?)` has no error slot, so the
        // metadata is the second argument, not the third. That asymmetry with
        // `error(message, error?, metadata?)` is the reason this cannot be a
        // single call site.
        expect(logger.warn.mock.calls[0]?.[1]).toMatchObject({
            statusCode: 400,
        });
    });

    test("an unmapped Error is a 500 and stays an error", () => {
        const logger = fakeLogger();
        const middleware = createErrorMiddleware(logger);
        const boom = new Error("prisma exploded");

        middleware(boom, fakeReq(), fakeRes() as never, jest.fn());

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.warn).not.toHaveBeenCalled();
        // The exception is handed over, not reduced to metadata, so pino can
        // serialise its stack. That is the case that must stay loud.
        expect(logger.error.mock.calls[0]?.[1]).toBe(boom);
        expect(logger.error.mock.calls[0]?.[2]).toMatchObject({
            statusCode: 500,
        });
    });

    test("a thrown string is a 500 and stays an error", () => {
        const logger = fakeLogger();
        const middleware = createErrorMiddleware(logger);

        middleware(
            "something went wrong",
            fakeReq(),
            fakeRes() as never,
            jest.fn(),
        );

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error.mock.calls[0]?.[2]).toMatchObject({
            statusCode: 500,
        });
    });
});
