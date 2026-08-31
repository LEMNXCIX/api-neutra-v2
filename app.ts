import express, { Request, Response } from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import lusca from "lusca";
import helmet from "helmet";

import config from "@/config/index.config";
import { connection } from "@/config/db.config";
import rateLimiter from "@/middleware/rateLimit.middleware";
import responseMiddleware from "@/middleware/response.middleware";
import { isProduction as checkProduction } from "@/core/domain/constants";
import requestMiddleware from "@/middleware/request.middleware";
import wideLogMiddleware from "@/middleware/wide-log.middleware";
import { contextMiddleware } from "@/middleware/context.middleware";
import { notFoundHandlerEnhanced } from "@/middleware/not-found.middleware";
import { tenantMiddleware } from "@/middleware/tenant.middleware";
import { corsMiddleware } from "@/middleware/cors.middleware";
import { devCookieDomainMiddleware } from "@/middleware/dev-cookie-domain.middleware";
import { Container } from "@/infrastructure/config/container";
import { errorMiddleware } from "@/middleware/error.middleware";
import { logger } from "@/infrastructure/providers/logger.instance";

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

const { port, ENVIRONMENT } = config;

// Process-level failure handlers: log and keep serving; a graceful exit is
// preferable to a silent hang (Node 20 keeps running on unhandled rejections).
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
app.use(wideLogMiddleware(Container.getLogRepository()));
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
app.use(corsMiddleware());
app.use(devCookieDomainMiddleware);

// Public / Global routes (no tenant context)
app.get("/", (_req: Request, res: Response) => {
    res.json({ name: "Ecommerce" });
});

// Tenant-agnostic routes (before tenant middleware)
tenants(app, Container.getTenantController());

// Tenant resolution for /api/* (before authenticated business routes)
app.use(tenantMiddleware);

// Domain routes (composition root)
auth(app, Container.getAuthController());
users(app, Container.getUserController());
products(app, Container.getProductController());
slide(app, Container.getSlideController());
cart(app, Container.getCartController());
order(app, Container.getOrderController());
category(app, Container.getCategoryController());
role(app, Container.getRoleController());
permission(app, Container.getPermissionController());

// Booking Module
serviceRoutes(app, Container.getServiceController());
staffRoutes(app, Container.getStaffController());
appointmentRoutes(app, Container.getAppointmentController());
banner(app, Container.getBannerController());
coupon(app, Container.getCouponController());
features(app, Container.getFeatureController());
whatsappRoutes(
    app,
    Container.getWhatsAppWebhookController(),
    Container.getWhatsAppConfigController(),
    Container.getWhatsAppController(),
);
logRoutes(app, Container.getLogController());

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
    connection();
    // Background workers only when running as the process entry
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./infrastructure/workers/notification.worker");

    const portNumber = typeof port === "string" ? parseInt(port, 10) : port;
    app.listen(portNumber, "0.0.0.0", () => {
        logger.info(`Server started on http://localhost:${portNumber} (0.0.0.0)`);
    });
}

export default app;
