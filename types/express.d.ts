import { AuthenticatedUser } from "@/types/rbac";

declare global {
    namespace Express {
        interface User extends AuthenticatedUser {}

        interface Request {
            tenantId?: string;
            tenant?: {
                id: string;
                name: string;
                slug: string;
                type: string;
                active: boolean;
            };
            traceId?: string;
            validatedBody?: any;
        }
    }
}

export {};
