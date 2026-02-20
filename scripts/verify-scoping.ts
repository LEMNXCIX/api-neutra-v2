import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../infrastructure/database/prisma/user.prisma-repository';

const prisma = new PrismaClient();

async function main() {
    const storeTenantId = 'default-tenant-00000000-0000-0000-0000-000000000001';
    const userRepository = new PrismaUserRepository();

    console.log('--- REPOSITORY FINDALL FOR STORE TENANT ---');
    const users = await userRepository.findAll(storeTenantId);

    console.log(JSON.stringify(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role?.name,
        tenant: u.tenant?.slug
    })), null, 2));

    console.log(`\nTotal users found for store: ${users.length}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
