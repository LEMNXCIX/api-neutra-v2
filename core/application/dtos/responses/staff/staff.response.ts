import { Staff } from "@/core/entities/staff.entity";
import {
    ITenantMinimalResponse,
    TenantMinimalResponse,
} from "../shared/tenant-minimal.response";

export interface IStaffResponse {
    id: string;
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active: boolean;
    workingHours?: Record<string, unknown>;
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
