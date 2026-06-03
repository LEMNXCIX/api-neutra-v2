export interface IStaffResponse {
    id: string;
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active: boolean;
    workingHours?: any;
    serviceIds?: string[];
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export class StaffResponse {
    static fromEntity(staff: any): IStaffResponse {
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
