import * as dotenv from "dotenv";
import {
    isProduction as checkProduction,
    isDevelopment as checkDevelopment,
} from "@/core/domain/constants";

dotenv.config();

const ENVIRONMENT =
    process.env.ENVIRONMENT || process.env.NODE_ENV || "development";

const config = {
    env: process.env.NODE_ENV,
    /** Prefer ENVIRONMENT over NODE_ENV; aliases prod/production handled via helpers */
    ENVIRONMENT,
    production: checkProduction(ENVIRONMENT),
    development: checkDevelopment(ENVIRONMENT),
    port: process.env.PORT || 4001,
    sesionSecret: process.env.SESSION_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    dbUsername: process.env.DB_USERNAME,
    dbPassword: process.env.DB_PASSWORD,
    dbHost: process.env.DB_HOST,
    dbName: process.env.DB_NAME,
    oauthClientID: process.env.OAUTH_CLIENT_ID,
    oauthClientSecret: process.env.OAUTH_CLIENT_SECRET,
    facebookAppID: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    githubClientID: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    twitterConsumerID: process.env.TWITTER_CONSUMER_ID,
    twitterConsumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    callbackURLDev: process.env.CALLBACK_URL_DEVELOPMENT,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
    redisPassword: process.env.REDIS_PASSWORD,
    /**
     * Comma-separated exact origins for CORS.
     * In production: replaces DEFAULT_PRODUCTION_ORIGINS when set.
     * In development: added to localhost/LAN patterns.
     */
    allowedOrigins: process.env.ALLOWED_ORIGINS || "",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
};

export default config;
