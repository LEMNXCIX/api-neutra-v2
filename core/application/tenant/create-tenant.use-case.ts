import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { TenantType, TenantConfig } from '@/core/entities/tenant.entity';
import { prisma } from '@/config/db.config';

export interface CreateTenantDTO {
    name: string;
    slug: string;
    type: TenantType;
    config?: TenantConfig;
}

export class CreateTenantUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private userRepository: IUserRepository,
        private logger: ILogger
    ) { }

    async execute(data: CreateTenantDTO, creatorId: string) {
        try {
            // Check if slug exists
            const existing = await this.tenantRepository.findBySlug(data.slug);
            if (existing) {
                return {
                    code: 400,
                    success: false,
                    message: 'Tenant with this slug already exists',
                };
            }

            const tenant = await this.tenantRepository.create({
                name: data.name,
                slug: data.slug,
                type: data.type,
                config: data.config,
                active: true,
            });

            // Find ADMIN role for the new tenant
            // Normally roles should be created automatically for a new tenant
            // Let's assume there is a service or logic that seeds roles for new tenants
            // For now, I'll create the basic ADMIN role if it doesn't exist (safety)
            // But it's better to have a dedicated RolesSeeder.

            // For simplicity and to ensure it works now, I'll create the roles for the new tenant here
            // In a real app, this should be in a separate service or hook.

            // Define default permissions for the tenant
            const defaultPermissions = [
                'users:read', 'users:manage',
                'products:read', 'products:write', 'products:delete',
                'orders:read', 'orders:manage',
                'stats:read',
                'categories:read', 'categories:write', 'categories:delete',
                'roles:read', 'roles:write', 'roles:delete',
                'permissions:read', 'permissions:write', 'permissions:delete',
                'services:read', 'services:write', 'services:delete',
                'staff:read', 'staff:write', 'staff:delete',
                'appointments:read', 'appointments:write', 'appointments:delete',
                'banners:read', 'banners:write', 'banners:delete',
                'coupons:read', 'coupons:write', 'coupons:delete',
            ];

            // Create/Find permissions for this tenant
            const createdPermissions = [];
            for (const permName of defaultPermissions) {
                const permission = await (prisma as any).permission.upsert({
                    where: { name: permName },
                    update: {},
                    create: {
                        name: permName,
                        description: `Permission for ${permName}`,
                        tenantId: tenant.id
                    }
                });
                createdPermissions.push(permission);
            }

            // Define roles with their permission sets
            const roles = [
                {
                    name: 'ADMIN',
                    level: 100,
                    description: 'Tenant Administrator',
                    permissions: defaultPermissions // ADMIN gets all permissions
                },
                {
                    name: 'STAFF',
                    level: 50,
                    description: 'Tenant Staff',
                    permissions: [
                        'users:read',
                        'products:read', 'products:write',
                        'orders:read', 'orders:manage',
                        'categories:read',
                        'services:read', 'services:write',
                        'staff:read',
                        'appointments:read', 'appointments:write'
                    ]
                },
                {
                    name: 'USER',
                    level: 1,
                    description: 'Registered User',
                    permissions: [
                        'products:read',
                        'orders:read',
                        'appointments:read', 'appointments:write'
                    ]
                }
            ];

            let adminRole;
            for (const r of roles) {
                const createdRole = await (prisma as any).role.create({
                    data: {
                        name: r.name,
                        level: r.level,
                        description: r.description,
                        tenantId: tenant.id
                    }
                });

                // Assign permissions to the role
                for (const permName of r.permissions) {
                    const permission = createdPermissions.find(p => p.name === permName);
                    if (permission) {
                        await (prisma as any).rolePermission.create({
                            data: {
                                roleId: createdRole.id,
                                permissionId: permission.id
                            }
                        });
                    }
                }

                if (r.name === 'ADMIN') adminRole = createdRole;
            }

            if (adminRole) {
                await this.userRepository.addTenant(creatorId, tenant.id, adminRole.id);
                this.logger.info(`Creator ${creatorId} associated as ADMIN for new tenant ${tenant.slug}`);
            }

            return {
                code: 201,
                success: true,
                data: tenant,
            };
        } catch (error: any) {
            return {
                code: 500,
                success: false,
                message: 'Error creating tenant',
            };
        }
    }
}
