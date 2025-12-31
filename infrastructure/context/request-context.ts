import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

export interface IRequestContext {
    req: Request;
    error?: any;
    [key: string]: any;
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

    static setError(error: any) {
        const store = this.get();
        if (store) {
            store.error = error;
        }
    }

    static getError(): any | undefined {
        return this.get()?.error;
    }
}
