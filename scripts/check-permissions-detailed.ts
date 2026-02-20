import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SUPER_ADMIN ROLE INVESTIGATION ---');
    const saRoles = await prisma.role.findMany({
        where: { name: 'SUPER_ADMIN' },
        include: {
            tenant: {
                select: {
                    slug: true
                }
            },
            permissions: {
                include: {
                    permission: true
                }
            }
        }
    });

    for (const role of saRoles) {
        console.log(`\nRole ID: ${role.id}`);
        console.log(`Role Name: ${role.name}`);
        console.log(`Tenant: ${role.tenant?.slug || 'GLOBAL'}`);
        console.log(`Permissions (${role.permissions.length}):`);
        console.log(role.permissions.map(p => p.permission.name).join(', '));
    }

    console.log('\n--- ALL USERS WITH ROLES ---');
    const users = await prisma.user.findMany({
        include: {
            tenants: {
                include: {
                    tenant: true,
                    role: true
                }
            }
        }
    });

    for (const user of users) {
        console.log(`\nUser: ${user.name} (${user.email})`);
        for (const ut of user.tenants) {
            console.log(`  - Tenant: ${ut.tenant.slug}, Role: ${ut.role.name}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
