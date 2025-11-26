import { prisma } from '@/config/db.config';

// Increase default timeout for slow DB operations
jest.setTimeout(20000);

beforeAll(async () => {
  // Ensure DB connection is established for tests that query models
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('Test DB connection failed:', err);
  }
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (err) {
    // ignore
  }
});
