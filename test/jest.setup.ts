import { prisma } from '@/config/db.config';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';

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
  // Close all connections to allow Jest to exit cleanly
  try {
    // Close Redis connection
    const redis = RedisProvider.getInstance();
    await redis.quit();
  } catch (err) {
    console.error('Redis disconnect error:', err);
  }

  try {
    // Close Prisma connection
    await prisma.$disconnect();
  } catch (err) {
    console.error('Prisma disconnect error:', err);
  }

  // Give connections time to close
  await new Promise(resolve => setTimeout(resolve, 500));
});
