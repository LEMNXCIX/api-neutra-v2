import { extractAuthToken } from "@/helpers/auth-token.helpers";
import { AUTH_CONSTANTS } from "@/core/domain/constants";
import type { Request } from "express";

function mockReq(partial: {
    cookies?: Record<string, string>;
    headers?: Record<string, string | undefined>;
}): Request {
    return {
        cookies: partial.cookies ?? {},
        headers: partial.headers ?? {},
    } as unknown as Request;
}

describe("extractAuthToken", () => {
    test("prefers cookie over Authorization header", () => {
        const token = extractAuthToken(
            mockReq({
                cookies: { [AUTH_CONSTANTS.COOKIE_NAME]: "cookie-token" },
                headers: { authorization: "Bearer header-token" },
            }),
        );
        expect(token).toBe("cookie-token");
    });

    test("reads Bearer token when no cookie", () => {
        const token = extractAuthToken(
            mockReq({
                headers: { authorization: "Bearer abc.def.ghi" },
            }),
        );
        expect(token).toBe("abc.def.ghi");
    });

    test("returns undefined when missing or empty", () => {
        expect(extractAuthToken(mockReq({}))).toBeUndefined();
        expect(
            extractAuthToken(
                mockReq({ headers: { authorization: "Bearer " } }),
            ),
        ).toBeUndefined();
        expect(
            extractAuthToken(
                mockReq({ headers: { authorization: "Token xyz" } }),
            ),
        ).toBeUndefined();
    });
});
