import express, { Request, Response, NextFunction } from 'express';
const session = require('express-session');
const morgan = require('morgan');
const cookie = require('cookie-parser');
const { port, sesionSecret, ENVIRONMENT } = require('./config/index.config');
const { connection } = require('./config/db.config');
const passport = require('passport');
const cors = require('cors');
const rateLimiter = require('./middleware/rateLimit.middleware');
const responseMiddleware = require('./middleware/response.middleware').default;
const logger = require('./helpers/logger.helpers');

// Rutas
const auth = require('./routes/auth.routes');
const users = require('./routes/users.routes');
const products = require('./routes/products.routes');
const slide = require('./routes/slide.routes');
const cart = require('./routes/cart.routes');
const order = require('./routes/order.routes');
const {
  useGoogleStrategy,
  useFacebookStrategy,
  useTwitterStrategy,
  useGitHubStrategy,
} = require('./middleware/authProvider.middleware');

const app = express();

// Only establish DB connection when running app directly

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(cookie());
// Apply rate limiter globally (relaxed in development)
app.use(rateLimiter());
// Standardize API responses and attach tracing/logging
app.use(responseMiddleware);

// Configure CORS dynamically based on ENVIRONMENT (dev or prod)
const allowedOriginsDev = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5500',
];

const allowedOriginsProd = [
  'https://www.neutra.ec',
  'https://neutra.ec',
  'https://www.admin.neutra.ec',
  'https://admin.neutra.ec',
];

const whitelist = ENVIRONMENT === 'prod' || ENVIRONMENT === 'production' ? allowedOriginsProd : allowedOriginsDev;

app.use(
  cors({
    origin: function (origin: any, callback: any) {
      // Allow non-browser requests like curl/postman (no origin)
      if (!origin) return callback(null, true);

      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  })
);

// Ensure correct Access-Control headers for preflight and responses
app.use(function (req: Request, res: Response, next: NextFunction) {
  // origin may be undefined
  const origin = (req.headers as any).origin;
  if (origin && whitelist.indexOf(origin) !== -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && ENVIRONMENT !== 'prod') {
    // allow requests without Origin in dev (like server-to-server or curl)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  next();
});

app.use(
  session({
    secret: sesionSecret,
    resave: false,
    saveUninitialized: false,
  })
);

// Usando las rutas
auth(app);
users(app);
products(app);
cart(app);
slide(app);
order(app);

// Ruta inicial del servidor
app.get('/', (req: Request, res: Response) => {
  return res.json({
    name: 'Ecommerce',
  });
});

// Levantar el servidor solo si se ejecuta directamente
if (require.main === module) {
  connection();
  app.listen(port, () => {
    console.log('Listening on: http://localhost:' + port);
  });
}

module.exports = app;
