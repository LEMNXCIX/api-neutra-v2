import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import config from '@/config/index.config';
import type { ILogger } from "@/core/providers/logger.interface";

const { dbUsername, dbPassword, dbHost, dbName } = config;

const connectionString = process.env.DATABASE_URL || `postgresql://${dbUsername}:${dbPassword}@${dbHost}:5432/${dbName}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const connection = async function (logger: ILogger) {
  try {
    await prisma.$connect();
    logger.info("Prisma Connected");
  } catch (error) {
    logger.error("Prisma Connection Error", error);
  }
};

const checkDatabaseConnection = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
};

export { checkDatabaseConnection, connection, prisma };
