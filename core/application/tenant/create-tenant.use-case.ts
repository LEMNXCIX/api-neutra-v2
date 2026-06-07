import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { IPermissionRepository } from "@/core/repositories/permission.repository.interface";
import { Permission } from "@/core/entities/permission.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { DuplicateEntityError } from "@/core/domain/errors/domain-errors";
import { CreateTenantDTO } from "@/core/application/dtos/requests/tenant.request";

export class CreateTenantUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
        private permissionRepository: IPermissionRepository,
    ) {}

    async execute(
        data: CreateTenantDTO,
        creatorId: string,
    ): Promise<UseCaseResult> {
        const existing = await this.tenantRepository.findBySlug(data.slug);
        if (existing) {
            throw new DuplicateEntityError("Tenant", "slug", data.slug);
        }

        const tenant = await this.tenantRepository.create({
            name: data.name,
            slug: data.slug,
            type: data.type,
            config: data.config,
            active: true,
        });

        const defaultPermissions = [
            "users:read",
            "users:manage",
            "products:read",
            "products:write",
            "products:delete",
            "orders:read",
            "orders:manage",
            "stats:read",
            "categories:read",
            "categories:write",
            "categories:delete",
            "roles:read",
            "roles:write",
            "roles:delete",
            "permissions:read",
            "permissions:write",
            "permissions:delete",
            "services:read",
            "services:write",
            "services:delete",
            "staff:read",
            "staff:write",
            "staff:delete",
            "appointments:read",
            "appointments:write",
            "appointments:delete",
            "banners:read",
            "banners:write",
            "banners:delete",
            "coupons:read",
            "coupons:write",
            "coupons:delete",
        ];

        const createdPermissions: Permission[] = [];
        for (const permName of defaultPermissions) {
            const permission = await this.permissionRepository.upsertByName(
                tenant.id,
                permName,
                `Permission for ${permName}`,
            );
            createdPermissions.push(permission);
        }

        const roles = [
            {
                name: "ADMIN",
                level: 100,
                description: "Tenant Administrator",
                permissions: defaultPermissions,
            },
            {
                name: "STAFF",
                level: 50,
                description: "Tenant Staff",
                permissions: [
                    "users:read",
                    "products:read",
                    "products:write",
                    "orders:read",
                    "orders:manage",
                    "categories:read",
                    "services:read",
                    "services:write",
                    "staff:read",
                    "appointments:read",
                    "appointments:write",
                ],
            },
            {
                name: "USER",
                level: 1,
                description: "Registered User",
                permissions: [
                    "products:read",
                    "orders:read",
                    "appointments:read",
                    "appointments:write",
                ],
            },
        ];

        let adminRole;
        for (const r of roles) {
            const permissionIds = r.permissions
                .map(
                    (permName) =>
                        createdPermissions.find((p) => p.name === permName)?.id,
                )
                .filter((id): id is string => id !== undefined);

            const createdRole = await this.roleRepository.createWithPermissions(
                tenant.id,
                {
                    name: r.name,
                    level: r.level,
                    description: r.description,
                    permissionIds,
                },
            );

            if (r.name === "ADMIN") adminRole = createdRole;
        }

        if (adminRole) {
            await this.userRepository.addTenant(
                creatorId,
                tenant.id,
                adminRole.id,
            );
        }

        return Success(tenant, "Tenant created successfully");
    }
}
