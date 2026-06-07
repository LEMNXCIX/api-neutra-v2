import { TIME_CONSTANTS } from "@/core/domain/constants";

export const DOMAIN_CONSTANTS = {
    LOCAL_LOCALHOST: ".localhost",
    LOCAL_NIPIO: ".nip.io",
    NIPIO_PARTS: 6,
} as const;

export const CORS_CONSTANTS: {
    MAX_AGE_SECONDS: number;
    METHODS: string[];
    ALLOWED_HEADERS: string[];
} = {
    MAX_AGE_SECONDS: TIME_CONSTANTS.DAY_MS,
    METHODS: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    ALLOWED_HEADERS: [
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With",
        "Origin",
        "x-tenant-id",
        "x-tenant-slug",
    ],
};

export const RATE_LIMIT_CONSTANTS = {
    WINDOW_MINUTES: 15,
    MAX_PRODUCTION: 100,
    MAX_DEVELOPMENT: 1000,
} as const;
