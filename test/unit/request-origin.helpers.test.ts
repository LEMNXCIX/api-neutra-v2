import type { Request } from "express";

import { resolveRequestOrigin } from "@/helpers/request-origin.helpers";

/**
 * This resolved origin is the client-facing base used for redirects, email deep
 * links and OAuth callbacks, so a wrong answer here is an open-redirect or a
 * link-poisoning surface. The file had no test at all, which meant the
 * precedence order between the override header, Origin, Referer and the request
 * host was entirely unverified.
 */
function requestWith(
    headers: Record<string, unknown>,
    host = "api.test",
): Request {
    return {
        headers,
        protocol: "https",
        get: (name: string) =>
            name.toLowerCase() === "host" ? host : undefined,
    } as unknown as Request;
}

describe("resolveRequestOrigin", () => {
    it("prefers the proxy override header above everything else", () => {
        const req = requestWith({
            "x-original-origin": "https://tenant.example.com",
            origin: "https://ignored-origin.example.com",
            referer: "https://ignored-referer.example.com/page",
        });

        expect(resolveRequestOrigin(req)).toBe("https://tenant.example.com");
    });

    it("trims whitespace from the override header", () => {
        const req = requestWith({
            "x-original-origin": "  https://trimmed.example.com  ",
        });

        expect(resolveRequestOrigin(req)).toBe("https://trimmed.example.com");
    });

    it("falls through when the override header is blank or not a string", () => {
        expect(
            resolveRequestOrigin(
                requestWith({
                    "x-original-origin": "   ",
                    origin: "https://origin.example.com",
                }),
            ),
        ).toBe("https://origin.example.com");

        // Node types a repeated header as string[]; that must not be returned.
        expect(
            resolveRequestOrigin(
                requestWith({
                    "x-original-origin": ["https://a.example.com"],
                    origin: "https://origin.example.com",
                }),
            ),
        ).toBe("https://origin.example.com");
    });

    it("uses the Origin header when there is no override", () => {
        const req = requestWith({
            origin: "https://origin.example.com",
            referer: "https://referer.example.com/page",
        });

        expect(resolveRequestOrigin(req)).toBe("https://origin.example.com");
    });

    it("reduces a Referer to its origin, dropping the path", () => {
        const req = requestWith({
            referer: "https://referer.example.com/deep/path?q=1#frag",
        });

        expect(resolveRequestOrigin(req)).toBe("https://referer.example.com");
    });

    it("falls through to the request host when the Referer will not parse", () => {
        const req = requestWith(
            { referer: "not a url at all" },
            "fallback.test",
        );

        expect(resolveRequestOrigin(req)).toBe("https://fallback.test");
    });

    it("falls through to the request host when no hint is present", () => {
        expect(resolveRequestOrigin(requestWith({}, "bare.test"))).toBe(
            "https://bare.test",
        );
    });

    it("uses the request protocol in the fallback, so a proxied http request stays http", () => {
        const req = {
            headers: {},
            protocol: "http",
            get: () => "plain.test",
        } as unknown as Request;

        expect(resolveRequestOrigin(req)).toBe("http://plain.test");
    });
});
