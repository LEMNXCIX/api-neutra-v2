import { User } from "@/core/entities/user.entity";

export interface IUserPublicResponse {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    profilePic?: string | null;
    active: boolean;
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
    createdAt?: Date;
    updatedAt?: Date;
}

export class UserPublicResponse {
    static fromEntity(user: User): IUserPublicResponse {
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
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
