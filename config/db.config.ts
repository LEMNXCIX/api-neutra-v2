import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import config from '@/config/index.config';

const { dbUsername, dbPassword, dbHost, dbName } = config;

const connectionString = process.env.DATABASE_URL || `postgresql://${dbUsername}:${dbPassword}@${dbHost}:5432/${dbName}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const connection = async function () {
  try {
    await prisma.$connect();
    console.log("Prisma Connected");
  } catch (error) {
    console.error("Prisma Connection Error", error);
  }
};

export { connection, prisma };
