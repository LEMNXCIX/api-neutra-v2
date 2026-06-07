import { User } from "@/core/entities/user.entity";
import { IUserPublicResponse } from "./user-public.response";

export interface IUserResponse extends IUserPublicResponse {
    tenants?: Array<{
        tenantId: string;
        roleId: string;
        role?: {
            id: string;
            name: string;
            level: number;
        };
        tenant?: {
            id: string;
            name: string;
            slug: string;
        };
    }>;
}

export class UserResponse {
    static fromEntity(user: User): IUserResponse {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone ?? null,
            profilePic: user.profilePic ?? null,
            active: user.active,
            role: user.role
                ? {
                      id: user.role.id,
                      name: user.role.name,
                      level: user.role.level,
                  }
                : undefined,
            tenant: user.tenant
                ? {
                      id: user.tenant.id,
                      name: user.tenant.name,
                      slug: user.tenant.slug,
                  }
                : undefined,
            tenants: user.tenants?.map(
                (ut: NonNullable<User["tenants"]>[number]) => ({
                    tenantId: ut.tenantId,
                    roleId: ut.roleId,
                    role: ut.role
                        ? {
                              id: ut.role.id,
                              name: ut.role.name,
                              level: ut.role.level,
                          }
                        : undefined,
                    tenant: ut.tenant
                        ? {
                              id: ut.tenant.id,
                              name: ut.tenant.name,
                              slug: ut.tenant.slug,
                          }
                        : undefined,
                }),
            ),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
