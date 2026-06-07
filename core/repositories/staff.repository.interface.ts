import { Staff } from "@/core/entities/staff.entity";
import {
    CreateStaffDTO,
    UpdateStaffDTO,
} from "@/core/application/dtos/requests/staff.request";

/**
 * Staff Repository Interface
 * Defines operations for Staff persistence
 */
export interface IStaffRepository {
    create(tenantId: string, data: CreateStaffDTO): Promise<Staff>;
    findById(tenantId: string, id: string): Promise<Staff | null>;
    findByEmail(tenantId: string, email: string): Promise<Staff | null>;
    findByUserId(tenantId: string, userId: string): Promise<Staff | null>;
    findAll(
        tenantId: string | undefined,
        activeOnly?: boolean,
    ): Promise<Staff[]>;
    update(tenantId: string, id: string, data: UpdateStaffDTO): Promise<Staff>;
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
