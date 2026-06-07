/**
 * Service Entity
 * Represents a service offering in the booking system
 */

import { Category } from "./category.entity";

export interface Service {
    id: string;
    name: string;
    description?: string;
    duration: number; // Duration in minutes
    price: number;
    categoryId?: string;
    category?: Category;
    active: boolean;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}
