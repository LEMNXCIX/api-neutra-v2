/**
 * Service Entity
 * Represents a service offering in the booking system
 */

import { Category } from "./category.entity";

export interface Service {
    id: string;
    name: string;
    description: string | null;
    duration: number; // Duration in minutes
    price: number;
    categoryId: string | null;
    category?: Category;
    active: boolean;
    tenantId: string;
    tenant?: { id: string; name: string; slug: string };
    createdAt: Date;
    updatedAt: Date;
}
