/**
 * Staff Entity
 * Represents a staff member who provides services
 */

export interface WorkingHours {
    [day: string]: {
        start: string; // "09:00"
        end: string;   // "17:00"
    } | null; // null = day off
}

export interface Staff {
    id: string;
    userId?: string; // Optional link to registered user
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active: boolean;
    workingHours?: any;
    serviceIds?: string[]; // Array of service IDs this staff can perform
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
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
