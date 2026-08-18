import express from "express";
import request from "supertest";
import { corsMiddleware } from "@/middleware/cors.middleware";

/**
 * Lightweight HTTP smoke for CORS (no DB / full app).
 */
function buildApp(isProduction: boolean) {
    const app = express();
    app.use(
        corsMiddleware({
            isProduction,
            allowedOrigins: isProduction
                ? "https://neutra.ec,https://admin.neutra.ec"
                : "",
        }),
    );
    app.get("/ping", (_req, res) => {
        res.status(200).json({ ok: true });
    });
    return app;
}

describe("CORS HTTP smoke", () => {
    test("dev allows localhost Origin and echoes it", async () => {
        const app = buildApp(false);
        const res = await request(app)
            .get("/ping")
            .set("Origin", "http://localhost:5173")
            .expect(200);

        expect(res.headers["access-control-allow-origin"]).toBe(
            "http://localhost:5173",
        );
        expect(res.headers["access-control-allow-credentials"]).toBe("true");
        expect(res.body).toEqual({ ok: true });
    });

    test("prod allows configured origin", async () => {
        const app = buildApp(true);
        const res = await request(app)
            .get("/ping")
            .set("Origin", "https://neutra.ec")
            .expect(200);

        expect(res.headers["access-control-allow-origin"]).toBe(
            "https://neutra.ec",
        );
    });

    test("prod blocks unknown origin (no ACAO header)", async () => {
        const app = buildApp(true);
        const res = await request(app)
            .get("/ping")
            .set("Origin", "https://evil.com");

        // cors package omits Allow-Origin when origin is denied
        expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    test("dev answers OPTIONS preflight for localhost", async () => {
        const app = buildApp(false);
        const res = await request(app)
            .options("/ping")
            .set("Origin", "http://127.0.0.1:3000")
            .set("Access-Control-Request-Method", "POST")
            .expect(204);

        expect(res.headers["access-control-allow-origin"]).toBe(
            "http://127.0.0.1:3000",
        );
        expect(res.headers["access-control-allow-methods"]).toMatch(/POST/i);
    });
});
