/**
 * Staff Entity
 * Represents a staff member who provides services
 */

export interface WorkingHours {
    [day: string]: { start: string; end: string } | null;
}

export interface Staff {
    id: string;
    userId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
    bio: string | null;
    active: boolean;
    workingHours: WorkingHours | null;
    serviceIds?: string[];
    tenantId: string;
    tenant?: { id: string; name: string; slug: string };
    createdAt: Date;
    updatedAt: Date;
}
