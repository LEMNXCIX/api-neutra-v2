import { User, CreateUserDTO } from '../entities/user.entity';

export interface UpdateUserDTO {
    name?: string;
    email?: string;
    password?: string;
    roleId?: string;  // Updated to use roleId instead of role
    profilePic?: string;
    googleId?: string;
    facebookId?: string;
    twitterId?: string;
    githubId?: string;
}

export interface FindUserOptions {
    includeRole?: boolean;
    includePermissions?: boolean;
}

export interface IUserRepository {
    findAll(): Promise<User[]>;
    findByEmail(email: string, options?: FindUserOptions): Promise<User | null>;
    findById(id: string, options?: FindUserOptions): Promise<User | null>;
    findByProvider(providerField: string, providerId: string): Promise<User | null>;
    create(user: CreateUserDTO): Promise<User>;
    update(id: string, user: Partial<User>): Promise<User>;
    linkProvider(email: string, providerField: string, providerId: string, profilePic?: string): Promise<User>;
    getUsersStats(): Promise<{ yearMonth: string; total: number }[]>;
}
