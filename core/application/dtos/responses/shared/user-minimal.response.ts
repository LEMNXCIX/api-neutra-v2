export interface IUserMinimalResponse {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    profilePic?: string | null;
}

export class UserMinimalResponse {
    static fromEntity(user: any): IUserMinimalResponse {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone ?? null,
            profilePic: user.profilePic ?? null,
        };
    }
}
