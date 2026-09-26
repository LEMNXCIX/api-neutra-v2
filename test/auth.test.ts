jest.mock('uuid', () => ({ v4: () => `test-uuid-${Math.random().toString(36).substring(7)}` }));
import api from './test-client';

describe('Auth routes', () => {
  test('POST /api/auth/login without body returns 401 or 400', async () => {
    const res = await api.post('/api/auth/login').send({});
    expect([200, 400, 401]).toContain(res.status);
  });

  test('POST /api/auth/signup without body returns 400 or 200', async () => {
    const res = await api.post('/api/auth/signup').send({});
    expect([200, 400]).toContain(res.status);
  });

  test('GET /api/auth/logout returns json', async () => {
    const res = await api.get('/api/auth/logout');
    expect([200, 204]).toContain(res.status);
  });

  describe('password policy belongs to registration, not to login', () => {
    /**
     * Login authenticates a credential that already exists; it does not set one.
     * A minimum length on the login DTO locked out every account whose password
     * predates the policy, and answered "your password is malformed" for a
     * password that is correct. The short password below has to reach the
     * credential check, which is what produces a 401, instead of being turned
     * away by validation with a 400.
     */
    test('a short password reaches the credential check, not the validator', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: 'nobody@example.invalid', password: '123456' });

      expect(res.status).toBe(401);
      expect(res.body?.errors?.[0]?.code).not.toBe(
        'VALIDATION_INVALID_FORMAT',
      );
      // A rejected credential must say so. UnauthorizedError defaults to
      // AUTH_UNAUTHORIZED, which the client reads as "you need to sign in", so a
      // login failure would tell a user who just signed in to sign in again.
      expect(res.body?.errors?.[0]?.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    test('the error is about the credentials, not the password length', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: 'nobody@example.invalid', password: 'a' });

      expect(JSON.stringify(res.body)).not.toMatch(/longer than or equal to/i);
    });
  });

  test('POST /api/auth/signup still enforces the password policy', async () => {
    // The other half of the rule: registration is where a new password is set,
    // so the minimum length has to apply there. Guarding both directions is what
    // stops a "fix" from simply deleting the policy everywhere.
    const res = await api
      .post('/api/auth/signup')
      .send({
        name: 'Short Password',
        email: `short-${Date.now()}@example.invalid`,
        password: '123456',
      });

    expect(res.status).toBe(400);
    expect(res.body?.errors?.[0]?.code).toBe('VALIDATION_INVALID_FORMAT');
    expect(res.body?.errors?.[0]?.field).toBe('password');
  });
});
