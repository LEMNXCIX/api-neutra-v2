import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const storeTenantId = 'default-tenant-00000000-0000-0000-0000-000000000001';

    console.log('--- USERS LINKED TO STORE TENANT ---');
    const userTenants = await prisma.userTenant.findMany({
        where: { tenantId: storeTenantId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            role: {
                select: {
                    name: true
                }
            }
        }
    });

    console.log(JSON.stringify(userTenants, null, 2));

    console.log('\n--- ALL TENANTS ---');
    const tenants = await prisma.tenant.findMany();
    console.log(JSON.stringify(tenants, null, 2));

    console.log('\n--- ALL USERS ---');
    const users = await prisma.user.findMany({
        include: {
            tenants: {
                include: {
                    tenant: true
                }
            }
        }
    });
    console.log(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email, tenants: u.tenants.map(ut => ut.tenant?.slug) })), null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
