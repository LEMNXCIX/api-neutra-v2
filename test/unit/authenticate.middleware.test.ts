// Import factories only — avoids loading Container/Prisma in unit tests
import { createAuthenticateMiddleware } from "@/middleware/authenticate.factory";
import { createOptionalAuthenticateMiddleware } from "@/middleware/optional-authenticate.factory";
import { ForbiddenError } from "@/core/domain/errors/domain-errors";
import { AUTH_CONSTANTS } from "@/core/domain/constants";
import type { Request, Response, NextFunction } from "express";

function createRes() {
    const res: Partial<Response> & {
        statusCode?: number;
        body?: unknown;
    } = {};
    res.status = jest.fn((code: number) => {
        res.statusCode = code;
        return res as Response;
    });
    res.json = jest.fn((body: unknown) => {
        res.body = body;
        return res as Response;
    });
    return res as Response & { statusCode?: number; body?: unknown };
}

function mockReq(partial: {
    cookies?: Record<string, string>;
    headers?: Record<string, string | undefined>;
    tenantId?: string;
}): Request {
    return {
        cookies: partial.cookies ?? {},
        headers: partial.headers ?? {},
        tenantId: partial.tenantId,
        tenant: undefined,
        user: undefined,
    } as unknown as Request;
}

describe("authenticate middleware (smoke)", () => {
    test("401 when token is missing", async () => {
        const resolveUser = { execute: jest.fn() };
        const mw = createAuthenticateMiddleware({
            resolveUser: resolveUser as never,
        });
        const req = mockReq({});
        const res = createRes();
        const next = jest.fn() as NextFunction;

        await mw(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(resolveUser.execute).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });

    test("sets req.user and calls next on success", async () => {
        const user = {
            id: "u1",
            email: "a@b.com",
            name: "A",
            role: { id: "r1", name: "USER", level: 1, permissions: [] },
        };
        const resolveUser = {
            execute: jest.fn().mockResolvedValue({ user }),
        };
        const mw = createAuthenticateMiddleware({
            resolveUser: resolveUser as never,
        });
        const req = mockReq({
            cookies: { [AUTH_CONSTANTS.COOKIE_NAME]: "tok" },
            tenantId: "t1",
        });
        const res = createRes();
        const next = jest.fn() as NextFunction;

        await mw(req, res, next);

        expect(resolveUser.execute).toHaveBeenCalledWith({
            token: "tok",
            tenantId: "t1",
            tenantSlug: undefined,
        });
        expect(req.user).toEqual(user);
        expect(next).toHaveBeenCalled();
    });

    test("maps DomainError to HTTP status", async () => {
        const resolveUser = {
            execute: jest
                .fn()
                .mockRejectedValue(new ForbiddenError("Account is inactive")),
        };
        const mw = createAuthenticateMiddleware({
            resolveUser: resolveUser as never,
        });
        const req = mockReq({
            headers: { authorization: "Bearer bad" },
        });
        const res = createRes();
        const next = jest.fn() as NextFunction;

        await mw(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect((res.body as { message: string }).message).toBe(
            "Account is inactive",
        );
        expect(next).not.toHaveBeenCalled();
    });
});

describe("optionalAuthenticate middleware (smoke)", () => {
    test("continues without token", async () => {
        const resolveUser = { execute: jest.fn() };
        const mw = createOptionalAuthenticateMiddleware({
            resolveUser: resolveUser as never,
        });
        const req = mockReq({});
        const res = createRes();
        const next = jest.fn() as NextFunction;

        await mw(req, res, next);

        expect(resolveUser.execute).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });

    test("invalid token still calls next as guest", async () => {
        const resolveUser = {
            execute: jest.fn().mockRejectedValue(new Error("jwt expired")),
        };
        const mw = createOptionalAuthenticateMiddleware({
            resolveUser: resolveUser as never,
        });
        const req = mockReq({
            headers: { authorization: "Bearer expired" },
        });
        const res = createRes();
        const next = jest.fn() as NextFunction;

        await mw(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });
});
