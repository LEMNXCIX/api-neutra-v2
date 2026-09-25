export interface HealthDependencies {
    database: boolean;
    redis: boolean;
}

export interface HealthReadiness {
    ready: boolean;
    dependencies: HealthDependencies;
}

export interface IHealthService {
    checkReadiness(): Promise<HealthReadiness>;
}
