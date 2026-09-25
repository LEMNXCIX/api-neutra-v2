import express, { Request, Response } from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import lusca from "lusca";
import helmet from "helmet";

import config from "@/config/index.config";
import { connection } from "@/config/db.config";
import rateLimiter from "@/middleware/rateLimit.middleware";
import createResponseMiddleware from "@/middleware/response.middleware";
import { isProduction as checkProduction } from "@/core/domain/constants";
import createRequestMiddleware from "@/middleware/request.middleware";
import wideLogMiddleware from "@/middleware/wide-log.middleware";
import { contextMiddleware } from "@/middleware/context.middleware";
import { notFoundHandlerEnhanced } from "@/middleware/not-found.middleware";
import { createTenantMiddleware } from "@/middleware/tenant.middleware";
import { createAuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { createOptionalAuthenticateMiddleware } from "@/middleware/optional-authenticate.middleware";
import { createRequireTenantFeature } from "@/middleware/tenant-feature.middleware";
import { corsMiddleware as createCorsMiddleware } from "@/middleware/cors.middleware";
import { devCookieDomainMiddleware } from "@/middleware/dev-cookie-domain.middleware";
import { createRuntime } from "@/infrastructure/config/runtime";
import { createHttpControllers } from "@/infrastructure/config/http-controllers/index";
import { createErrorMiddleware } from "@/middleware/error.middleware";
import healthRoutes from "@/infrastructure/routes/health.routes";
import { scheduleAppointmentReviewSweep } from "@/infrastructure/services/queue.service";

// Rutas
import auth from "@/infrastructure/routes/auth.routes";
import users from "@/infrastructure/routes/users.routes";
import products from "@/infrastructure/routes/products.routes";
import slide from "@/infrastructure/routes/slide.routes";
import cart from "@/infrastructure/routes/cart.routes";
import order from "@/infrastructure/routes/order.routes";
import category from "@/infrastructure/routes/category.routes";
import role from "@/infrastructure/routes/role.routes";
import permission from "@/infrastructure/routes/permission.routes";
import banner from "@/infrastructure/routes/banner.routes";
import coupon from "@/infrastructure/routes/coupon.routes";
import tenants from "@/infrastructure/routes/tenant.routes";
import features from "@/infrastructure/routes/feature.routes";
import whatsappRoutes from "@/infrastructure/routes/whatsapp.routes";
import logRoutes from "@/infrastructure/routes/log.routes";
import { swaggerSpec } from "@/infrastructure/config/swagger.config";
import { apiReference } from "@scalar/express-api-reference";

// Booking Module Routes
import serviceRoutes from "@/infrastructure/routes/service.routes";
import staffRoutes from "@/infrastructure/routes/staff.routes";
import appointmentRoutes from "@/infrastructure/routes/appointment.routes";
import loyaltyRoutes from "@/infrastructure/routes/loyalty.routes";

const { port, ENVIRONMENT } = config;

const runtime = createRuntime();
const controllers = createHttpControllers(runtime);
const logger = runtime.providers.logger;
const authenticate = createAuthenticateMiddleware({
    resolveUser: runtime.useCases.resolveAuthenticatedUser,
});
const optionalAuthenticate = createOptionalAuthenticateMiddleware({
    resolveUser: runtime.useCases.resolveAuthenticatedUser,
    logger: runtime.providers.logger,
});
const requireTenantFeature = createRequireTenantFeature({
    featureRepository: runtime.repositories.feature,
});
const tenantMiddleware = createTenantMiddleware({
    tenantRepository: runtime.repositories.tenant,
    environment: ENVIRONMENT,
    logger: runtime.providers.logger,
});
const requestMiddleware = createRequestMiddleware(runtime.providers.logger);
const responseMiddleware = createResponseMiddleware(runtime.providers.logger);
const corsMiddleware = createCorsMiddleware(runtime.providers.logger);
const errorMiddleware = createErrorMiddleware(runtime.providers.logger);

// Process-level failure handlers: log and keep serving; a graceful exit is
// preferable to a silent hang (Node 22 keeps running on unhandled rejections).
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", reason);
});
process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
});

const app = express();

// Trust proxy settings (required for express-rate-limit behind Docker/Proxies)
app.set("trust proxy", 1);

// Security headers (CSP enabled with targeted allowances for docs/admin assets)
app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https:"],
                frameAncestors: ["'self'"],
            },
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
);

// Middlewares (orden: contexto > logging > parsing > security > custom)
app.use(contextMiddleware);
app.use(
    wideLogMiddleware(runtime.repositories.log, runtime.providers.logger),
);
if (!checkProduction(ENVIRONMENT)) {
    app.use(morgan("dev"));
}
// Large payloads (base64 image uploads) allowed only on image-heavy routes;
// everything else keeps a small default limit (DoS surface reduction).
for (const imagePath of [
    "/api/products",
    "/api/banners",
    "/api/sliders",
    "/api/users",
]) {
    app.use(imagePath, express.json({ limit: "10mb" }));
    app.use(imagePath, express.urlencoded({ limit: "10mb", extended: true }));
}
// Default body limit is small; large payloads are enabled per-route above.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ limit: "100kb", extended: true }));
app.use(requestMiddleware);
app.use(cookieParser());

// CSRF only in production-like environments (prod | production)
if (checkProduction(ENVIRONMENT)) {
    app.use(lusca.csrf());
}

app.use(rateLimiter());
app.use(responseMiddleware);
app.use(corsMiddleware);
app.use(devCookieDomainMiddleware);

// Public health routes are registered before tenant/authenticated routes.
healthRoutes(app, controllers.health);

// Public / Global routes (no tenant context)
app.get("/", (_req: Request, res: Response) => {
    res.json({ name: "Ecommerce" });
});

// Tenant-agnostic routes (before tenant middleware)
tenants(app, controllers.tenant, authenticate);

// Tenant resolution for /api/* (before authenticated business routes)
app.use(tenantMiddleware);

// Domain routes (composition root)
auth(app, controllers.auth, authenticate);
users(app, controllers.user, authenticate);
products(
    app,
    controllers.product,
    authenticate,
    optionalAuthenticate,
);
slide(
    app,
    controllers.slide,
    authenticate,
    optionalAuthenticate,
    requireTenantFeature,
);
cart(app, controllers.cart, authenticate);
order(app, controllers.order, authenticate);
category(
    app,
    controllers.category,
    authenticate,
    optionalAuthenticate,
);
role(app, controllers.role, authenticate);
permission(app, controllers.permission, authenticate);

// Booking Module
serviceRoutes(
    app,
    controllers.service,
    authenticate,
    optionalAuthenticate,
);
staffRoutes(app, controllers.staff, authenticate);
appointmentRoutes(app, controllers.appointment, authenticate);
loyaltyRoutes(
    app,
    controllers.loyalty,
    authenticate,
    requireTenantFeature,
);
banner(
    app,
    controllers.banner,
    authenticate,
    requireTenantFeature,
);
coupon(
    app,
    controllers.coupon,
    authenticate,
    requireTenantFeature,
);
features(app, controllers.feature, authenticate);
whatsappRoutes(
    app,
    controllers.whatsappWebhook,
    controllers.whatsappConfig,
    controllers.whatsapp,
    authenticate,
    requireTenantFeature,
);
logRoutes(app, controllers.log, authenticate);

// Documentation
app.use(
    "/reference",
    apiReference({
        content: swaggerSpec,
        theme: "purple",
    }),
);

// 404 Handler - after all routes
app.use(notFoundHandlerEnhanced);

// Global Error Handler - last middleware
app.use(errorMiddleware);

// Server entrypoint only (avoids workers/DB side-effects when tests import app)
if (require.main === module) {
    connection(runtime.providers.logger);
    // Background workers only when running as the process entry
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createNotificationWorker } =
        require("./infrastructure/workers/notification.worker");
    createNotificationWorker({
        appointmentRepository: runtime.repositories.appointment,
        tenantRepository: runtime.repositories.tenant,
        emailService: runtime.services.email,
        notificationService: runtime.services.notification,
        logger: runtime.providers.logger,
        connection: runtime.connections.redis,
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAppointmentReviewWorker } =
        require("./infrastructure/workers/appointment-review.worker");
    createAppointmentReviewWorker({
        sweepAppointmentReviews: runtime.useCases.sweepAppointmentReviews,
        logger: runtime.providers.logger,
        connection: runtime.connections.redis,
        maintenanceQueue: runtime.queues.maintenance,
        schedule: scheduleAppointmentReviewSweep,
    });

    const portNumber = typeof port === "string" ? parseInt(port, 10) : port;
    app.listen(portNumber, "0.0.0.0", () => {
        logger.info(`Server started on http://localhost:${portNumber} (0.0.0.0)`);
    });
}

export default app;
