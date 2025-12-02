import { createClient, RedisClientType } from 'redis';
import config from '@/config/index.config';
import { info, error as logError } from '@/helpers/logger.helpers';

export class RedisProvider {
    private static instance: RedisProvider;
    private client: RedisClientType;
    private isConnected: boolean = false;

    private constructor() {
        const url = `redis://${config.redisHost || 'localhost'}:${config.redisPort || 6379}`;

        this.client = createClient({
            url,
            password: config.redisPassword
        });

        this.client.on('error', (err) => {
            logError({ message: 'Redis Client Error', error: err });
            this.isConnected = false;
        });

        this.client.on('connect', () => {
            info({ message: 'Redis Client Connected' });
            this.isConnected = true;
        });

        this.connect();
    }

    public static getInstance(): RedisProvider {
        if (!RedisProvider.instance) {
            RedisProvider.instance = new RedisProvider();
        }
        return RedisProvider.instance;
    }

    private async connect() {
        if (!this.isConnected) {
            try {
                await this.client.connect();
            } catch (err) {
                logError({ message: 'Failed to connect to Redis', error: err });
            }
        }
    }

    public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
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

    public async quit(): Promise<void> {
        await this.client.quit();
        this.isConnected = false;
    }
}
