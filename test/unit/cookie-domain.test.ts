// getCookieDomain: session cookie scope per environment (pure logic over req host)
process.env.NODE_ENV = "development";

export {};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cookieOptions } = require("@/helpers/authResponse.helpers");

function reqWithHost(host?: string) {
    return { get: (_name: string) => host } as never;
}

describe("cookieOptions domain scoping", () => {
    test("bare localhost shares the cookie across subdomains", () => {
        const opts = cookieOptions(reqWithHost("localhost:3000"));
        expect(opts.domain).toBe("localhost");
    });

    test("subdomain of localhost gets .localhost", () => {
        expect(
            cookieOptions(reqWithHost("default.localhost:3000")).domain,
        ).toBe(".localhost");
        expect(
            cookieOptions(reqWithHost("superadmin.localhost")).domain,
        ).toBe(".localhost");
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
