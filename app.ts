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
import { swaggerSpec } from "@/infrastructure/config/swagger.config";
import { apiReference } from "@scalar/express-api-reference";
const { port, sesionSecret, ENVIRONMENT } = config;

const app = express();

// DB connection solo si directo
// In TypeScript/ESM, require.main === module is tricky. 
// Since we compile to CommonJS, this might still work if we declare require.
// But better to rely on a separate server file or just run connection if not imported.
// For now, we'll assume this file is the entry point if run directly.
if (require.main === module) {
  connection();
}


import requestMiddleware from "@/middleware/request.middleware";

// Middlewares (orden funcional: logging > parsing > security > custom)
app.use(morgan("dev"));
app.use(express.json());
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

const isProduction = ENVIRONMENT === "prod" || ENVIRONMENT === "production";
const whitelist = isProduction ? allowedOriginsProd : allowedOriginsDev;

// Helper function to validate origin
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    return !isProduction;
  }

  // Check environment variable ALLOWED_ORIGINS
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    if (envOrigins.includes(origin)) return true;
  }

  // Exact match in whitelist
  if (whitelist.includes(origin)) {
    return true;
  }

  // In development, allow localhost and local network IPs
  if (!isProduction) {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    const localNetworkPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

    return localhostPattern.test(origin) || localNetworkPattern.test(origin);
  }

  return false;
};

app.use(
  cors({
    origin: (origin: any, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = isOriginAllowed(origin);

      if (allowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin || 'undefined'}`);
        callback(new Error(`Origin ${origin || 'undefined'} not allowed by CORS policy`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400, // 24 hours - cache preflight requests
  })
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
      "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept, X-Requested-With, Origin"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  next();
});

app.use(
  session({
    secret: sesionSecret as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax', // Strongly recommended, but optional
    }
  })
);

import { notFoundHandlerEnhanced } from "@/middleware/not-found.middleware";

// Rutas (composición)
// Routes are now default exports that take 'app' as argument
auth(app);
users(app);
products(app);
slide(app);
cart(app);
order(app);
category(app);
role(app);
permission(app);
banner(app);
coupon(app);

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
    theme: 'purple',
  })
);


// 404 Handler - Must be after all routes
app.use(notFoundHandlerEnhanced);

// Server lift
if (require.main === module) {
  const portNumber = typeof port === 'string' ? parseInt(port, 10) : port;
  app.listen(portNumber, '0.0.0.0', () => {
    console.log(`Server started successfully!`);
    console.log(`Local: http://localhost:${portNumber}`);
    console.log(`Network: http://192.168.68.105:${portNumber}`);
  });
}

export default app;
