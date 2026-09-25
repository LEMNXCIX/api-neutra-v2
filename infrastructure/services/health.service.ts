import {
    HealthReadiness,
    IHealthService,
} from "@/core/ports/health-service.interface";

export const READINESS_TIMEOUT_MS = 2000;

type DependencyProbe = () => Promise<unknown>;

export class HealthService implements IHealthService {
    constructor(
        private readonly databaseProbe: DependencyProbe,
        private readonly redisProbe: DependencyProbe,
        private readonly timeoutMs = READINESS_TIMEOUT_MS,
    ) {}

    async checkReadiness(): Promise<HealthReadiness> {
        const [database, redis] = await Promise.all([
            this.probe(this.databaseProbe),
            this.probe(this.redisProbe),
        ]);

        return {
            ready: database && redis,
            dependencies: { database, redis },
        };
    }

    private async probe(check: DependencyProbe): Promise<boolean> {
        let timeout: ReturnType<typeof setTimeout> | undefined;

        try {
            return await Promise.race([
                Promise.resolve()
                    .then(check)
                    .then(
                        () => true,
                        () => false,
                    ),
                new Promise<boolean>((resolve) => {
                    timeout = setTimeout(
                        () => resolve(false),
                        this.timeoutMs,
                    );
                }),
            ]);
        } finally {
            if (timeout) clearTimeout(timeout);
        }
    }
}
