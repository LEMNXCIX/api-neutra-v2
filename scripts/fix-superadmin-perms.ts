import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- ASSIGNING ALL PERMISSIONS TO SUPER_ADMIN ---');

    // 1. Get the SUPER_ADMIN role (the one without a tenantId or the global one)
    const saRole = await prisma.role.findFirst({
        where: { name: 'SUPER_ADMIN' }
    });

    if (!saRole) {
        console.error('SUPER_ADMIN role not found');
        return;
    }

    // 2. Get all permissions
    const allPermissions = await prisma.permission.findMany();
    console.log(`Found ${allPermissions.length} permissions.`);

    // 3. Link them to the role
    for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: saRole.id,
                    permissionId: permission.id
                }
            },
            update: {},
            create: {
                roleId: saRole.id,
                permissionId: permission.id
            }
        });
    }

    console.log('Successfully assigned all permissions to SUPER_ADMIN.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
