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

    // Banners
    { name: 'banners:read', description: 'View banners' },
    { name: 'banners:write', description: 'Create and update banners' },
    { name: 'banners:delete', description: 'Delete banners' },

    // Coupons
    { name: 'coupons:read', description: 'View coupons' },
    { name: 'coupons:write', description: 'Create and update coupons' },
    { name: 'coupons:delete', description: 'Delete coupons' },
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
            'categories:delete',
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
            'banners:read',
            'banners:write',
            'banners:delete',
            'coupons:read',
            'coupons:write',
            'coupons:delete',
        ],
    },
];

async function main() {
    // 1. Crear permisos
    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission,
        });
    }

    // 2. Crear roles estándar con sus permisos
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
    }

    // 3. Crear Tenant Específico (SuperAdmin Tenant)
    const specificTenantId = '13acd170-dab5-4f0e-aee6-a8f302eabde2';
    await prisma.tenant.upsert({
        where: { id: specificTenantId },
        update: {},
        create: {
            id: specificTenantId,
            name: 'Neutra SuperAdmin',
            slug: 'superadmin',
            type: 'HYBRID',
            active: true,
            config: {
                features: {
                    coupons: true,
                    appointmentCoupons: true,
                    banners: true,
                    orders: true
                }
            }
        },
    });

    // 4. Crear Role Específico (SuperAdmin)
    const superAdminRoleId = 'fd3d55d4-c564-4404-b59c-59f4ba429a5a';
    await prisma.role.upsert({
        where: { id: superAdminRoleId },
        update: {},
        create: {
            id: superAdminRoleId,
            name: 'SUPER_ADMIN',
            description: 'Full system access',
            level: 100,
            active: true,
            tenantId: specificTenantId,
        },
    });

    // 5. Crear Usuario Específico (Leonardo)
    const leonardoUserId = 'ebd39837-ed6f-4f24-b0cb-77150ed18b86';
    await prisma.user.upsert({
        where: { id: leonardoUserId },
        update: {},
        create: {
            id: leonardoUserId,
            name: 'Leonardo',
            email: 'fake@mail.com',
            password: '$2b$10$ft6tc04llemqzUkua8qa1e7WsghWN0DF4e8QKPe6NDUtbogvTE8k6',
            roleId: superAdminRoleId,
            tenantId: specificTenantId,
            profilePic: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABIAAAAKICAYAAAAIK4ENAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAABEzSURBVHhe7dgxDQAwDMCw8oc7Au0/CJEPP4GQ2TcLAAAAQNf8AQAAAIAWAwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDsEUrX6+VgFogAAAABJRU5ErkJggg==',
            active: true,
        },
    });

    // 6. Crear Cart para el usuario Leonardo
    await prisma.cart.upsert({
        where: { userId: leonardoUserId },
        update: {},
        create: {
            userId: leonardoUserId,
        },
    });
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
