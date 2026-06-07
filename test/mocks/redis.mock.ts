const store = new Map<string, { value: string; expiresAt?: number }>();

const cleanupExpired = (key: string) => {
    const entry = store.get(key);
    if (entry?.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
    }
};

type EventCallback = (...args: any[]) => void;

const createMockClient = () => {
    const listeners: Record<string, EventCallback[]> = {};

    const emit = (event: string, ...args: any[]) => {
        (listeners[event] || []).forEach((cb) => cb(...args));
    };

    const client = {
        on: jest
            .fn()
            .mockImplementation((event: string, callback: EventCallback) => {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(callback);
                return client;
            }),
        connect: jest.fn().mockImplementation(() => {
            emit("connect");
            return Promise.resolve(undefined);
        }),
        disconnect: jest.fn().mockResolvedValue(undefined),
        quit: jest.fn().mockResolvedValue(undefined),
        isOpen: true,
        isReady: true,
        set: jest
            .fn()
            .mockImplementation(
                (key: string, value: string, opts?: { EX?: number }) => {
                    const expiresAt = opts?.EX
                        ? Date.now() + opts.EX * 1000
                        : undefined;
                    store.set(key, { value, expiresAt });
                    return Promise.resolve("OK");
                },
            ),
        get: jest.fn().mockImplementation((key: string) => {
            cleanupExpired(key);
            const entry = store.get(key);
            return Promise.resolve(entry?.value ?? null);
        }),
        del: jest.fn().mockImplementation((key: string) => {
            store.delete(key);
            return Promise.resolve(1);
        }),
        exists: jest.fn().mockImplementation((key: string) => {
            cleanupExpired(key);
            return Promise.resolve(store.has(key) ? 1 : 0);
        }),
        expire: jest.fn().mockImplementation((key: string, seconds: number) => {
            const entry = store.get(key);
            if (entry) {
                entry.expiresAt = Date.now() + seconds * 1000;
                return Promise.resolve(1);
            }
            return Promise.resolve(0);
        }),
        ping: jest.fn().mockResolvedValue("PONG"),
    };

    return client;
};

export const createClient = jest
    .fn()
    .mockImplementation(() => createMockClient());
