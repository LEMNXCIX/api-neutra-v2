import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const storeTenantId = 'default-tenant-00000000-0000-0000-0000-000000000001';

    console.log('--- PRODUCTS IN STORE TENANT ---');
    const products = await prisma.product.findMany({
        where: { tenantId: storeTenantId },
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    console.log(JSON.stringify(products.map(p => ({
        id: p.id,
        name: p.name,
        ownerEmail: p.owner.email
    })), null, 2));

    const ownerIds = [...new Set(products.map(p => p.ownerId))];
    console.log('\n--- OWNERS OF PRODUCTS IN STORE ---');
    console.log(ownerIds);

    const userTenants = await prisma.userTenant.findMany({
        where: {
            userId: { in: ownerIds },
            tenantId: storeTenantId
        }
    });
    console.log('\n--- OWNERS LINKED TO STORE TENANT ---');
    console.log(userTenants);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
