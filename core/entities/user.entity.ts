export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: 'USER' | 'ADMIN';
    profilePic?: string;
    googleId?: string;
    facebookId?: string;
    githubId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateUserDTO {
    name: string;
    email: string;
    password?: string;
    role?: 'USER' | 'ADMIN';
    profilePic?: string;
    googleId?: string;
    facebookId?: string;
    githubId?: string;
}
