import supertest from 'supertest';
import app from '@/app';

const request = supertest(app);
const DEFAULT_TENANT_ID = 'default-tenant-id'; // Use a UUID or string based on your schema

// Wrapper to automatically add tenant header
const api = {
    get: (url: string) => request.get(url).set('x-tenant-id', DEFAULT_TENANT_ID),
    post: (url: string) => request.post(url).set('x-tenant-id', DEFAULT_TENANT_ID),
    put: (url: string) => request.put(url).set('x-tenant-id', DEFAULT_TENANT_ID),
    delete: (url: string) => request.delete(url).set('x-tenant-id', DEFAULT_TENANT_ID),
    patch: (url: string) => request.patch(url).set('x-tenant-id', DEFAULT_TENANT_ID),
};

export default api;
