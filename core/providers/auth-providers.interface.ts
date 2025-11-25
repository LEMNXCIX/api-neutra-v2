export interface IPasswordHasher {
    hash(password: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
}

export interface ITokenGenerator {
    generate(payload: any): string;
    verify(token: string): any;
}
