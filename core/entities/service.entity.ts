/**
 * Service Entity
 * Represents a service offering in the booking system
 */

export interface Service {
    id: string;
    name: string;
    description?: string;
    duration: number; // Duration in minutes
    price: number;
    category?: string;
    active: boolean;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateServiceDTO {
    name: string;
    description?: string;
    duration: number;
    price: number;
    category?: string;
    active?: boolean;
}

export interface UpdateServiceDTO {
    name?: string;
    description?: string;
    duration?: number;
    price?: number;
    category?: string;
    active?: boolean;
}
