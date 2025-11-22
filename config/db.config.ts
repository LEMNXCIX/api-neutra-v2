import { PrismaClient } from '@prisma/client';
import config from './index.config';

const { dbUsername, dbPassword, dbHost, dbName } = config;

const prisma = new PrismaClient();

const connection = async function () {
  try {
    await prisma.$connect();
    console.log("Prisma Connected");
  } catch (error) {
    console.error("Prisma Connection Error", error);
  }
};

export { connection, prisma };
