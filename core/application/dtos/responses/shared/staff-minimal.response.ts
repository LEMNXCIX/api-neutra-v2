export interface IStaffMinimalResponse {
    id: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
}

export class StaffMinimalResponse {
    static fromEntity(
        staff: Pick<IStaffMinimalResponse, "id" | "name"> & {
            email?: string;
            avatar?: string;
        },
    ): IStaffMinimalResponse {
        return {
            id: staff.id,
            name: staff.name,
            email: staff.email ?? null,
            avatar: staff.avatar ?? null,
        };
    }
}
