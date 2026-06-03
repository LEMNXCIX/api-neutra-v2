export interface IStaffMinimalResponse {
    id: string;
    name: string;
    avatar?: string | null;
}

export class StaffMinimalResponse {
    static fromEntity(staff: any): IStaffMinimalResponse {
        return {
            id: staff.id,
            name: staff.name,
            avatar: staff.avatar ?? null,
        };
    }
}
