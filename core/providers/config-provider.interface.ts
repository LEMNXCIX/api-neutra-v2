export interface IConfigProvider {
    getFrontendUrl(): string;
    getSmtpFrom(): string;
    getNodeEnv(): string;
}
