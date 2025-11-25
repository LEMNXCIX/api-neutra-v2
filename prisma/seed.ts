import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Permisos predefinidos
const PERMISSIONS = [
    // Users
    { name: 'users:read', description: 'View users list and details' },
    { name: 'users:write', description: 'Create and update users' },
    { name: 'users:delete', description: 'Delete users' },
    { name: 'users:manage', description: 'Full user management including roles' },

    // Products
    { name: 'products:read', description: 'View products' },
    { name: 'products:write', description: 'Create and update products' },
    { name: 'products:delete', description: 'Delete products' },

    // Orders
    { name: 'orders:read', description: 'View orders' },
    { name: 'orders:write', description: 'Create and update orders' },
    { name: 'orders:manage', description: 'Full order management' },

    // Stats
    { name: 'stats:read', description: 'View statistics and analytics' },

    // Slides
    { name: 'slides:write', description: 'Manage slideshow content' },

    // Cart
    { name: 'cart:read', description: 'View own cart' },
    { name: 'cart:write', description: 'Manage own cart items' },

    // Categories
    { name: 'categories:read', description: 'View categories' },
    { name: 'categories:write', description: 'Create and update categories' },
    { name: 'categories:delete', description: 'Delete categories' },

    // Roles
    { name: 'roles:read', description: 'View roles' },
    { name: 'roles:write', description: 'Create and update roles' },
    { name: 'roles:delete', description: 'Delete roles' },

    // Permissions
    { name: 'permissions:read', description: 'View permissions' },
    { name: 'permissions:write', description: 'Create and update permissions' },
    { name: 'permissions:delete', description: 'Delete permissions' },
];

// Roles predefinidos con sus permisos
const ROLES = [
    {
        name: 'USER',
        level: 1,
        description: 'Regular customer',
        permissions: [
            'products:read',
            'orders:read',  // Solo sus propias órdenes (se implementa en lógica de negocio)
            'orders:write', // Crear órdenes
            'cart:read',
            'cart:write',
            'categories:read',
        ],
    },
    {
        name: 'MANAGER',
        level: 5,
        description: 'Store manager',
        permissions: [
            'products:read',
            'products:write',
            'orders:read',
            'orders:manage',
            'stats:read',
            'users:read',
            'cart:read',
            'categories:read',
            'categories:write',
        ],
    },
    {
        name: 'ADMIN',
        level: 10,
        description: 'System administrator',
        permissions: [
            'users:manage',
            'products:read',
            'products:write',
            'products:delete',
            'orders:manage',
            'stats:read',
            'slides:write',
            'cart:read',
            'cart:write',
            'categories:read',
            'categories:write',
            'categories:delete',
            'roles:read',
            'roles:write',
            'roles:delete',
            'permissions:read',
            'permissions:write',
            'permissions:delete',
        ],
    },
];

async function main() {
    console.log('🌱 Starting RBAC seed...');

    // 1. Crear permisos
    console.log('📋 Creating permissions...');
    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission,
        });
    }
    console.log(`✅ Created ${PERMISSIONS.length} permissions`);

    // 2. Crear roles con sus permisos
    console.log('👥 Creating roles...');
    for (const roleData of ROLES) {
        const { permissions: permissionNames, ...roleInfo } = roleData;

        // Crear rol
        const role = await prisma.role.upsert({
            where: { name: roleInfo.name },
            update: {
                description: roleInfo.description,
                level: roleInfo.level,
            },
            create: roleInfo,
        });

        // Obtener IDs de permisos
        const permissions = await prisma.permission.findMany({
            where: {
                name: { in: permissionNames },
            },
        });

        // Asignar permisos al rol
        for (const permission of permissions) {
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                },
                update: {},
                create: {
                    roleId: role.id,
                    permissionId: permission.id,
                },
            });
        }

        console.log(`  ✓ Role '${role.name}' created with ${permissions.length} permissions`);
    }

    console.log('✅ RBAC seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Permissions: ${PERMISSIONS.length}`);
    console.log(`  - Roles: ${ROLES.length}`);
    console.log('\n💡 Next steps:');
    console.log('  1. Update JWT provider to include role permissions');
    console.log('  2. Create authorization middleware');
    console.log('  3. Migrate routes to use permission-based auth');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
