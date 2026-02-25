import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- ALL ROLES ---');
    const roles = await prisma.role.findMany({
        include: {
            permissions: {
                include: {
                    permission: true
                }
            }
        }
    });
    console.log(JSON.stringify(roles.map(r => ({
        id: r.id,
        name: r.name,
        tenantId: r.tenantId,
        permissions: r.permissions.map(p => p.permission.name)
    })), null, 2));

    console.log('\n--- ALL PERMISSIONS ---');
    const permissions = await prisma.permission.findMany();
    console.log(JSON.stringify(permissions.map(p => p.name), null, 2));

    console.log('\n--- SUPER_ADMIN ROLES ---');
    const saRoles = await prisma.role.findMany({
        where: { name: 'SUPER_ADMIN' },
        include: {
            permissions: {
                include: {
                    permission: true
                }
            }
        }
    });
    console.log(JSON.stringify(saRoles, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
