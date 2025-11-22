export interface ITokenGenerator {
    generate(payload: any): string;
    verify(token: string): any;
}
