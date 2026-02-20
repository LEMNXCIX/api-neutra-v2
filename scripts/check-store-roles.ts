import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const storeTenantId = 'default-tenant-00000000-0000-0000-0000-000000000001';

    console.log('--- ROLES IN STORE TENANT ---');
    const roles = await prisma.role.findMany({
        where: { tenantId: storeTenantId }
    });
    console.log(JSON.stringify(roles, null, 2));

    console.log('\n--- GLOBAL ROLES (tenantId is null) ---');
    const globalRoles = await prisma.role.findMany({
        where: { tenantId: null }
    });
    console.log(JSON.stringify(globalRoles, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
