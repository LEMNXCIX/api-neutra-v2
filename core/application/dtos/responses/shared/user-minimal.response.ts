export interface IUserMinimalResponse {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    profilePic?: string | null;
}

export class UserMinimalResponse {
    static fromEntity(
        user: Pick<IUserMinimalResponse, "id" | "name" | "email"> & {
            phone?: string;
            profilePic?: string;
            pushToken?: string;
        },
    ): IUserMinimalResponse {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone ?? null,
            profilePic: user.profilePic ?? null,
        };
    }
}
