export interface WorkingHours {
    [day: string]: {
        start: string;
        end: string;
    } | null;
}

export interface CreateStaffDTO {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active?: boolean;
    workingHours?: WorkingHours;
}

export interface UpdateStaffDTO {
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active?: boolean;
    workingHours?: WorkingHours;
}

export interface AssignStaffServiceDTO {
    serviceId: string;
}

export interface SyncStaffServicesDTO {
    serviceIds: string[];
}
