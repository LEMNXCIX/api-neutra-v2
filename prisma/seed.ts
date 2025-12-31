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

    // Features (Super Admin)
    { name: 'features:read', description: 'View available features' },
    { name: 'features:write', description: 'Create and update features' },
    { name: 'features:delete', description: 'Delete features' },

    // Booking Module
    { name: 'services:read', description: 'View services' },
    { name: 'services:write', description: 'Create and update services' },
    { name: 'services:delete', description: 'Delete services' },
    { name: 'staff:read', description: 'View staff' },
    { name: 'staff:write', description: 'Create and update staff' },
    { name: 'staff:delete', description: 'Delete staff' },
    { name: 'appointments:read', description: 'View appointments' },
    { name: 'appointments:write', description: 'Create and update appointments' },
    { name: 'appointments:delete', description: 'Delete appointments' },
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
            'services:read',
            'staff:read',
            'appointments:read',
            'appointments:write',
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
            'features:read',
            'features:write',
            'features:delete',
            'services:read',
            'services:write',
            'services:delete',
            'staff:read',
            'staff:write',
            'staff:delete',
            'appointments:read',
            'appointments:write',
            'appointments:delete',
        ],
    },
];

// Features
const FEATURES = [
    { key: 'APPOINTMENTS', name: 'Booking System', description: 'Enable booking system', category: 'MODULE', price: 0 },
    { key: 'BANNERS', name: 'Marketing Banners', description: 'Enable marketing banners', category: 'MODULE', price: 0 },
    { key: 'COUPONS', name: 'Coupons Management', description: 'Permite la gestion de cupones', category: 'MODULE', price: 0.5 },
    { key: 'EMAIL_NOTIFICATIONS', name: 'Email Notifications', description: 'Enable email notifications', category: 'INTEGRATION', price: 0 },
    { key: 'ORDERS', name: 'Order Management', description: 'Enable order management', category: 'MODULE', price: 0 },
    { key: 'WHATSAPP_API', name: 'WhatsApp API Integration', description: 'Integración con la API de WhatsApp', category: 'INTEGRATION', price: 5 },
];

async function main() {
    // 0. Crear Features
    for (const feature of FEATURES) {
        await prisma.feature.upsert({
            where: { key: feature.key },
            update: {},
            create: feature
        });
    }

    // 1. Crear permisos
    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission,
        });
    }

    // 2. Crear Tenant Específico (SuperAdmin Tenant)
    const specificTenantId = '13acd170-dab5-4f0e-aee6-a8f302eabde2';
    const superAdminTenant = await prisma.tenant.upsert({
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
                    orders: true,
                    emailNotifications: true
                }
            }
        },
    });

    // 3. Crear roles estándar para el SuperAdmin Tenant
    for (const roleData of ROLES) {
        const { permissions: permissionNames, ...roleInfo } = roleData;

        // Crear rol para el tenant específico
        const role = await prisma.role.upsert({
            where: {
                tenantId_name: {
                    tenantId: superAdminTenant.id,
                    name: roleInfo.name
                }
            },
            update: {
                description: roleInfo.description,
                level: roleInfo.level,
            },
            create: {
                ...roleInfo,
                tenantId: superAdminTenant.id
            },
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

    // 4. Crear Role Específico (SUPER_ADMIN) para el tenant superadmin
    const superAdminRoleId = 'fd3d55d4-c564-4404-b59c-59f4ba429a5a';
    const superAdminRole = await prisma.role.upsert({
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
    const user = await (prisma as any).user.upsert({
        where: { id: leonardoUserId },
        update: {},
        create: {
            id: leonardoUserId,
            name: 'Leonardo',
            email: 'fake@mail.com',
            password: '$2b$10$ft6tc04llemqzUkua8qa1e7WsghWN0DF4e8QKPe6NDUtbogvTE8k6',
            profilePic: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABIAAAAKICAYAAAAIK4ENAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAABEzSURBVHhe7dgxDQAwDMCw8oc7Au0/CJEPP4GQ2TcLAAAAQNf8AQAAAIAWAwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDOAAAAAAOIMIAAAAIA4AwgAAAAgzgACAAAAiDsEUrX6+VgFogAAAABJRU5ErkJggg==',
            active: true,
        },
    });

    // 6. Vincular Usuario al Tenant con el Rol SuperAdmin
    // Note: If Prisma generated the name differently, check model name or use (prisma as any)
    await (prisma as any).userTenant.upsert({
        where: {
            userId_tenantId: {
                userId: user.id,
                tenantId: specificTenantId
            }
        },
        update: {
            roleId: superAdminRole.id
        },
        create: {
            userId: user.id,
            tenantId: specificTenantId,
            roleId: superAdminRole.id
        }
    });

    // 7. Crear Cart para el usuario Leonardo
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
