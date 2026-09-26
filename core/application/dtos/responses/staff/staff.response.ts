import { Staff } from "@/core/entities/staff.entity";
import {
    ITenantMinimalResponse,
    TenantMinimalResponse,
} from "../shared/tenant-minimal.response";

export interface IStaffResponse {
    id: string;
    userId?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    bio?: string | null;
    active: boolean;
    workingHours?: Record<string, unknown> | null;
    serviceIds?: string[];
    tenantId: string;
    tenant?: ITenantMinimalResponse;
    createdAt: Date;
    updatedAt: Date;
}

export class StaffResponse {
    static fromEntity(staff: Staff): IStaffResponse {
        return {
            id: staff.id,
            userId: staff.userId,
            name: staff.name,
            email: staff.email,
            phone: staff.phone,
            avatar: staff.avatar,
            bio: staff.bio,
            active: staff.active,
            workingHours: staff.workingHours,
            serviceIds: staff.serviceIds,
            tenantId: staff.tenantId,
    tenant: staff.tenant
                ? TenantMinimalResponse.fromEntity(staff.tenant)
                : undefined,
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt,
        };
    }
}
