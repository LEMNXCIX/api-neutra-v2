import express, { Request, Response, NextFunction } from "express";
const morgan = require("morgan");
import cookieParser from "cookie-parser";
const { port, sesionSecret, ENVIRONMENT } = require("./config/index.config");
const session = require("express-session");
const { connection } = require("./config/db.config");
const passport = require("passport");
const cors = require("cors");
const rateLimiter = require("./middleware/rateLimit.middleware");
import responseMiddleware from "./middleware/response.middleware"; // Asume maneja ApiResponse
import logger from "./helpers/logger.helpers";

// Rutas
import auth from "./routes/auth.routes";
import users from "./routes/users.routes";
import products from "./routes/products.routes";
import slide from "./routes/slide.routes";
import cart from "./routes/cart.routes";
import order from "./routes/order.routes";
// import {
//   useGoogleStrategy,
//   useFacebookStrategy,
//   useTwitterStrategy,
//   useGitHubStrategy,
// } from "./middleware/authProvider.middleware";

const app = express();

// DB connection solo si directo
if (require.main === module) {
  connection();
}

// Middlewares (orden funcional: logging > parsing > security > custom)
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiter());
app.use(responseMiddleware); // Estandariza responses a ApiResponse

// CORS dinámico (sin cambios)
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
    secret: sesionSecret,
    resave: false,
    saveUninitialized: false,
  })
);

// Rutas (composición)
[auth, users, products, slide, cart, order].forEach((routeFn) => routeFn(app));

// Ruta raíz
app.get("/", (req: Request, res: Response) => {
  // Simple root response; response middleware will wrap it if needed
  res.json({ name: "Ecommerce" });
});

// Server lift
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Listening on: http://localhost:${port}`);
  });
}

export default app;
