export interface CreateUserDTO {
    name: string;
    email: string;
    password?: string;
    profilePic?: string;
    phone?: string;
    pushToken?: string;
    active?: boolean;
    googleId?: string;
    facebookId?: string;
    twitterId?: string;
    githubId?: string;
}

export interface UpdateUserDTO {
    name?: string;
    email?: string;
    password?: string;
    profilePic?: string;
    phone?: string;
    pushToken?: string;
    active?: boolean;
}

export interface AssignRoleDTO {
    roleId: string;
}

export interface ProviderDataDTO {
    provider: string;
    idProvider: string;
    name: string;
    email: string;
    profilePic?: string;
}
