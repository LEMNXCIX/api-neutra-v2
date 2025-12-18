
export enum TenantType {
    STORE = 'STORE',
    BOOKING = 'BOOKING',
    HYBRID = 'HYBRID'
}

export class Tenant {
    id: string;
    name: string;
    slug: string;
    type: TenantType;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(
        id: string,
        name: string,
        slug: string,
        type: TenantType,
        active: boolean,
        createdAt: Date,
        updatedAt: Date
    ) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.type = type;
        this.active = active;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
