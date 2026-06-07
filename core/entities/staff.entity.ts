/**
 * Staff Entity
 * Represents a staff member who provides services
 */

export interface WorkingHours {
    [day: string]: { start: string; end: string } | null;
}

export interface Staff {
    id: string;
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active: boolean;
    workingHours?: WorkingHours;
    serviceIds?: string[];
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}
