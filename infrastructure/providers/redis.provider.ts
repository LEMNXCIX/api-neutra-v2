import { createClient, type RedisClientType } from "redis";
import config from "@/config/index.config";
import type { ICacheProvider } from "@/core/providers/cache-provider.interface";
import type { ILogger } from "@/core/providers/logger.interface";

export class RedisProvider implements ICacheProvider {
    private client: RedisClientType;
    private isConnected: boolean = false;

    public constructor(private readonly logger: ILogger) {
        const url = `redis://${config.redisHost || "localhost"}:${config.redisPort || 6379}`;

        this.client = createClient({
            url,
            password: config.redisPassword,
        });

        this.client.on("error", (err) => {
            this.logger.error("Redis Client Error", err);
            this.isConnected = false;
        });

        this.client.on("connect", () => {
            this.logger.info("Redis Client Connected");
            this.isConnected = true;
        });

        this.connect();
    }

    private async connect() {
        if (!this.isConnected) {
            try {
                await this.client.connect();
            } catch (err) {
                this.logger.error("Failed to connect to Redis", err);
            }
        }
    }

    public async set(
        key: string,
        value: string,
        ttlSeconds?: number,
    ): Promise<void> {
        if (!this.isConnected) await this.connect();

        if (ttlSeconds) {
            await this.client.set(key, value, { EX: ttlSeconds });
        } else {
            await this.client.set(key, value);
        }
    }

    public async get(key: string): Promise<string | null> {
        if (!this.isConnected) await this.connect();
        return await this.client.get(key);
    }

    public async del(key: string): Promise<void> {
        if (!this.isConnected) await this.connect();
        await this.client.del(key);
    }

    public async ping(): Promise<string> {
        if (!this.isConnected) await this.connect();

        return this.client.ping();
    }

    public async quit(): Promise<void> {
        await this.client.quit();
        this.isConnected = false;
    }
}
