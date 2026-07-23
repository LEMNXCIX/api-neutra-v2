export interface JWTPayload {
    id: string;
    email: string;
    name: string;
    role: {
        id: string;
        name: string;
        level: number;
    };
    tenantId?: string;
}

export interface AuthenticatedUser extends JWTPayload {
    role: {
        id: string;
        name: string;
        level: number;
        permissions: string[];
    };
}
