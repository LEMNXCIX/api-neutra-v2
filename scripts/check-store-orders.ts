import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const storeTenantId = 'default-tenant-00000000-0000-0000-0000-000000000001';

    console.log('--- ORDERS IN STORE TENANT ---');
    const orders = await prisma.order.findMany({
        where: { tenantId: storeTenantId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    console.log(JSON.stringify(orders.map(o => ({
        id: o.id,
        userEmail: o.user.email,
        total: o.total,
        createdAt: o.createdAt
    })), null, 2));

    const userIdsWithOrders = [...new Set(orders.map(o => o.userId))];
    console.log('\n--- USERS WITH ORDERS IN STORE ---');
    console.log(userIdsWithOrders);

    console.log('\n--- USER-TENANT LINKS FOR THESE USERS ---');
    const userTenants = await prisma.userTenant.findMany({
        where: {
            userId: { in: userIdsWithOrders }
        },
        include: {
            tenant: true
        }
    });
    console.log(JSON.stringify(userTenants.map(ut => ({
        userId: ut.userId,
        tenantSlug: ut.tenant.slug
    })), null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
