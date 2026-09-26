import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

function isErrorBag(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface IRequestContext {
    req: Request;
    /**
     * Opaque error bag captured during the request. It is only forwarded to the
     * request log, so the store never asserts a shape for it; readers narrow it.
     */
    error?: unknown;
    /** Extra per-request values attached by middleware (heterogeneous by nature). */
    [key: string]: unknown;
}

export class RequestContext {
    private static storage = new AsyncLocalStorage<IRequestContext>();

    static run(context: IRequestContext, next: () => void) {
        this.storage.run(context, next);
    }

    static get(): IRequestContext | undefined {
        return this.storage.getStore();
    }

    static getReq(): Request | undefined {
        return this.get()?.req;
    }

    static setError(error: unknown) {
        const store = this.get();
        if (store) {
            store.error = error;
        }
    }

    /**
     * Narrowed at the boundary: consumers (the request log) only accept a
     * key/value bag, so a non-record is reported as "no error captured".
     */
    static getError(): Record<string, unknown> | undefined {
        const error = this.get()?.error;
        return isErrorBag(error) ? error : undefined;
    }
}
