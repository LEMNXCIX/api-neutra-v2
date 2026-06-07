export interface TokenPayload {
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

export interface DecodedToken {
    id: string;
    email: string;
    name: string;
    role: {
        id: string;
        name: string;
        level: number;
    };
    tenantId?: string;
    iat?: number;
    exp?: number;
}

export interface IPasswordHasher {
    hash(password: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
}

export interface ITokenGenerator {
    generate(payload: TokenPayload): string;
    verify(token: string): DecodedToken;
}
