import supertest from 'supertest';
import app from '@/app';

const request = supertest(app);
// The slug the seed creates (prisma/seed.ts:195 creates a tenant with slug
// `superadmin`). The previous value, `default-tenant-id`, was never seeded — it
// only resolved because the tenant middleware fabricated a tenant under
// NODE_ENV=test instead of looking it up.
const DEFAULT_TENANT_SLUG = 'superadmin';

// Wrapper to automatically add tenant header
const api = {
    get: (url: string) => request.get(url).set('x-tenant-slug', DEFAULT_TENANT_SLUG),
    post: (url: string) => request.post(url).set('x-tenant-slug', DEFAULT_TENANT_SLUG),
    put: (url: string) => request.put(url).set('x-tenant-slug', DEFAULT_TENANT_SLUG),
    delete: (url: string) => request.delete(url).set('x-tenant-slug', DEFAULT_TENANT_SLUG),
    patch: (url: string) => request.patch(url).set('x-tenant-slug', DEFAULT_TENANT_SLUG),
};

export default api;
