// getCookieDomain: session cookie scope per environment (pure logic over req host)
process.env.NODE_ENV = "development";

export {};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cookieOptions } = require("@/helpers/authResponse.helpers");

function reqWithHost(host?: string, originalOrigin?: string) {
    const headers: Record<string, string | undefined> = {
        host,
        "x-original-origin": originalOrigin,
    };

    return { get: (name: string) => headers[name.toLowerCase()] } as never;
}

describe("cookieOptions domain scoping", () => {
    test("bare localhost uses a host-only cookie", () => {
        const opts = cookieOptions(reqWithHost("localhost:3000"));
        expect(opts.domain).toBeUndefined();
    });

    test("localhost subdomains use host-only cookies", () => {
        expect(
            cookieOptions(reqWithHost("default.localhost:3000")).domain,
        ).toBeUndefined();
        expect(
            cookieOptions(reqWithHost("superadmin.localhost")).domain,
        ).toBeUndefined();
    });

    test("proxied localhost origin does not broaden cookie scope", () => {
        expect(
            cookieOptions(
                reqWithHost(
                    "localhost:3000",
                    "http://superadmin.localhost:3001",
                ),
            ).domain,
        ).toBeUndefined();
    });

    test.each([
        ["non-local", "https://example.com"],
        ["malformed", "not a valid origin"],
    ])("ignores a %s proxied origin", (_label, originalOrigin) => {
        expect(
            cookieOptions(reqWithHost("localhost:3000", originalOrigin)).domain,
        ).toBeUndefined();
    });

    test("nip.io with IP gets the last 6 parts as domain", () => {
        expect(
            cookieOptions(reqWithHost("172.27.16.1.nip.io:3000")).domain,
        ).toBe(".172.27.16.1.nip.io");
    });

    test("short nip.io host falls back to .nip.io", () => {
        expect(cookieOptions(reqWithHost("myapp.nip.io")).domain).toBe(
            ".nip.io",
        );
    });

    test("no host means no domain", () => {
        expect(cookieOptions(reqWithHost(undefined)).domain).toBeUndefined();
    });

    test("dev flags: not httpOnly, not secure, sameSite lax", () => {
        const opts = cookieOptions(reqWithHost("localhost"));
        expect(opts.httpOnly).toBe(false);
        expect(opts.secure).toBe(false);
        expect(opts.sameSite).toBe("lax");
    });
});
