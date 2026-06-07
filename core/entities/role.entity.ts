import { Permission } from "@/core/entities/permission.entity";

export interface Role {
    id: string;
    name: string;
    description?: string | null;
    level: number;
    active: boolean;
    permissions?: Permission[];
    createdAt: Date;
    updatedAt: Date;
}
