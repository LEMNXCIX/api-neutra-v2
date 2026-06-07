export interface Permission {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
    createdAt: Date;
}
