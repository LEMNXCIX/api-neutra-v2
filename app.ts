import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import lusca from "lusca";

import config from "@/config/index.config";
import { connection } from "@/config/db.config";
import rateLimiter from "@/middleware/rateLimit.middleware";
import responseMiddleware from "@/middleware/response.middleware";
import logger from "@/helpers/logger.helpers";
import {
  AUTH_CONSTANTS,
  CORS_CONSTANTS,
  isProduction as checkProduction,
} from "@/core/domain/constants";

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

// Initialize Background Workers
import "@/infrastructure/workers/notification.worker";

const { port, sesionSecret, ENVIRONMENT } = config;

const app = express();
//SAS
// Trust proxy settings (required for express-rate-limit behind Docker/Proxies)
app.set("trust proxy", 1);

// DB connection solo si directo
// In TypeScript/ESM, require.main === module is tricky.
// Since we compile to CommonJS, this might still work if we declare require.
// But better to rely on a separate server file or just run connection if not imported.
// For now, we'll assume this file is the entry point if run directly.
if (require.main === module) {
  connection();
}

import requestMiddleware from "@/middleware/request.middleware";
import wideLogMiddleware from "@/middleware/wide-log.middleware";
import { contextMiddleware } from "@/middleware/context.middleware";

// Middlewares (orden funcional: contexto > logging > parsing > security > custom)
app.use(contextMiddleware);
app.use(wideLogMiddleware);
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(requestMiddleware);
app.use(cookieParser());
// CSRF protection only in production
if (ENVIRONMENT === "prod" || ENVIRONMENT === "production") {
  app.use(lusca.csrf());
}
app.use(rateLimiter());
app.use(responseMiddleware); // Estandariza responses a ApiResponse

// CORS Configuration - Enhanced
const allowedOriginsDev = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4001",
  "http://localhost:5173", // Vite default
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:4001",
  "http://127.0.0.1:5173",
  "http://192.168.68.105:3000",
  "http://127.0.0.1:5500", // LiveServer
];

const allowedOriginsProd = [
  "https://www.neutra.ec",
  "https://neutra.ec",
  "https://www.admin.neutra.ec",
  "https://admin.neutra.ec",
];

const isProduction = checkProduction(ENVIRONMENT);
const whitelist = isProduction ? allowedOriginsProd : allowedOriginsDev;

// Helper function to validate origin
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    return !isProduction;
  }

  // Check environment variable ALLOWED_ORIGINS
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(",").map((o) =>
      o.trim(),
    );
    if (envOrigins.includes(origin)) return true;
  }

  // Exact match in whitelist
  if (whitelist.includes(origin)) {
    return true;
  }

  // In development, allow localhost and local network IPs
  if (!isProduction) {
    // Modified regex to allow subdomains of localhost (e.g., superadmin.localhost)
    const localhostPattern =
      /^https?:\/\/((.+\.)?localhost|127\.0\.0\.1)(:\d+)?$/;
    const localNetworkPattern =
      /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

    return localhostPattern.test(origin) || localNetworkPattern.test(origin);
  }

  return false;
};

app.use(
  cors({
    origin: (
      origin: any,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowed = isOriginAllowed(origin);

      if (allowed) {
        callback(null, true);
      } else {
        logger.warn(
          `CORS blocked request from origin: ${origin || "undefined"}`,
        );
        callback(
          new Error(
            `Origin ${origin || "undefined"} not allowed by CORS policy`,
          ),
        );
      }
    },
    credentials: true,
    methods: CORS_CONSTANTS.METHODS,
    allowedHeaders: CORS_CONSTANTS.ALLOWED_HEADERS,
    exposedHeaders: ["Set-Cookie"],
    maxAge: CORS_CONSTANTS.MAX_AGE_SECONDS, // 24 hours - cache preflight requests
  }),
);

// Additional CORS headers for enhanced compatibility
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;

  if (isOriginAllowed(origin)) {
    // Set origin if allowed
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (!isProduction) {
      // In development, allow requests without origin
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Methods",
      CORS_CONSTANTS.METHODS.join(", "),
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      CORS_CONSTANTS.ALLOWED_HEADERS.join(", "),
    );
    res.setHeader(
      "Access-Control-Max-Age",
      String(CORS_CONSTANTS.MAX_AGE_SECONDS),
    );
    return res.status(204).end();
  }

  next();
});

// Token cookie domain middleware for development
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!isProduction && req.cookies.token) {
    const host = req.get("host");
    if (host && host.includes(".localhost")) {
      // Re-set the cookie with the correct domain if it's missing or set to the specific host
      // This is a safety measure to ensure the token remains shared
      res.cookie(AUTH_CONSTANTS.COOKIE_NAME, req.cookies.token, {
        domain: AUTH_CONSTANTS.LOCAL_DOMAIN,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        expires: new Date(Date.now() + AUTH_CONSTANTS.COOKIE_EXPIRES_MS),
      });
    }
  }
  next();
});

import { notFoundHandlerEnhanced } from "@/middleware/not-found.middleware";
import { tenantMiddleware } from "@/middleware/tenant.middleware";
import { Container } from "@/infrastructure/config/container";
import { errorMiddleware } from "@/middleware/error.middleware";

tenants(app, Container.getTenantController());

// Tenant Middleware - MUST be registered AFTER auth, BEFORE routes
// This ensures every request has tenant context
app.use(tenantMiddleware);

// Rutas (composición)
// Routes are now default exports that take 'app' and their controller as argument
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
  Container.getWhatsAppController()
);
logRoutes(app, Container.getLogController());

// Ruta raíz
app.get("/", (req: Request, res: Response) => {
  res.json({ name: "Ecommerce" });
});

// Documentation
app.use(
  "/reference",
  apiReference({
    spec: {
      content: swaggerSpec,
    },
    theme: "purple",
  }),
);

// 404 Handler - Must be after all routes
app.use(notFoundHandlerEnhanced);

// Global Error Handler - MUST be the last middleware
app.use(errorMiddleware);

// Server lift
if (require.main === module) {
  const portNumber = typeof port === "string" ? parseInt(port, 10) : port;
  app.listen(portNumber, "0.0.0.0", () => {
    console.log(`Server started successfully!`);
    console.log(`Local: http://localhost:${portNumber}`);
    console.log(`Network: http://192.168.68.105:${portNumber}`);
  });
}

export default app;
