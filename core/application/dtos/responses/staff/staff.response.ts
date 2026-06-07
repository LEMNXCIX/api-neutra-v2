import { Staff } from "@/core/entities/staff.entity";

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
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt,
        };
    }
}
