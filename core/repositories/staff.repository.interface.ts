import { Staff } from "@/core/entities/staff.entity";

type WorkingHours = {
    [day: string]: {
        start: string;
        end: string;
    } | null;
};

export type CreateStaffData = {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active?: boolean;
    workingHours?: WorkingHours;
};

export type UpdateStaffData = {
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    active?: boolean;
    workingHours?: WorkingHours;
};

/**
 * Staff Repository Interface
 * Defines operations for Staff persistence
 */
export interface IStaffRepository {
    create(tenantId: string, data: CreateStaffData): Promise<Staff>;
    findById(tenantId: string, id: string): Promise<Staff | null>;
    findByEmail(tenantId: string, email: string): Promise<Staff | null>;
    findByUserId(tenantId: string, userId: string): Promise<Staff | null>;
    findAll(
        tenantId: string | undefined,
        activeOnly?: boolean,
    ): Promise<Staff[]>;
    update(tenantId: string, id: string, data: UpdateStaffData): Promise<Staff>;
    delete(tenantId: string, id: string): Promise<void>;

    // Service assignment
    assignService(
        tenantId: string,
        staffId: string,
        serviceId: string,
    ): Promise<void>;
    removeService(
        tenantId: string,
        staffId: string,
        serviceId: string,
    ): Promise<void>;
    getServices(tenantId: string, staffId: string): Promise<string[]>; // Returns service IDs
    syncServices(
        tenantId: string,
        staffId: string,
        serviceIds: string[],
    ): Promise<void>;
}
