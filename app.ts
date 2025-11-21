import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import cors from "cors";

import config from "./config/index.config";
import { connection } from "./config/db.config";
import rateLimiter from "./middleware/rateLimit.middleware";
import responseMiddleware from "./middleware/response.middleware";
import logger from "./helpers/logger.helpers";

// Rutas
import auth from "./routes/auth.routes";
import users from "./routes/users.routes";
import products from "./routes/products.routes";
import slide from "./routes/slide.routes";
import cart from "./routes/cart.routes";
import order from "./routes/order.routes";

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

// Middlewares (orden funcional: logging > parsing > security > custom)
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiter());
app.use(responseMiddleware); // Estandariza responses a ApiResponse

// CORS dinámico
const allowedOriginsDev = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:5500",
];
const allowedOriginsProd = [
  "https://www.neutra.ec",
  "https://neutra.ec",
  "https://www.admin.neutra.ec",
  "https://admin.neutra.ec",
];
const whitelist =
  ENVIRONMENT === "prod" || ENVIRONMENT === "production"
    ? allowedOriginsProd
    : allowedOriginsDev;

app.use(
  cors({
    origin: (origin: any, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || whitelist.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
    ],
  })
);

// Headers manuales para preflight
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && whitelist.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin && ENVIRONMENT !== "prod") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With"
  );
  next();
});

app.use(
  session({
    secret: sesionSecret as string,
    resave: false,
    saveUninitialized: false,
  })
);

// Rutas (composición)
// Routes are now default exports that take 'app' as argument
auth(app);
users(app);
products(app);
slide(app);
cart(app);
order(app);

// Ruta raíz
app.get("/", (req: Request, res: Response) => {
  res.json({ name: "Ecommerce" });
});

// Server lift
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Listening on: http://localhost:${port}`);
  });
}

export default app;
