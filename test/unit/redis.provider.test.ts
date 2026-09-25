import { createClient } from "redis";
import { RedisProvider } from "@/infrastructure/providers/redis.provider";

describe("RedisProvider explicit composition", () => {
    const logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        logRequest: jest.fn(),
        logResponse: jest.fn(),
    };

    it("constructs independent providers without a singleton and preserves cache operations", async () => {
        const first = new RedisProvider(logger);
        const second = new RedisProvider(logger);

        expect(first).not.toBe(second);
        expect(createClient).toHaveBeenCalledTimes(2);

        await first.set("explicit:key", "value", 60);
        await expect(first.get("explicit:key")).resolves.toBe("value");
        await expect(first.ping()).resolves.toBe("PONG");
        await first.quit();
    });
});
