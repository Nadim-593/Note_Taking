import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import healthRouter from './routes/health.route';
import authRouter from './routes/auth.route';
import noteRouter from './routes/note.route';
import userRouter from './routes/user.route';
import adminRouter from './routes/admin.route';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

const app: Application = express();

// ── Reverse Proxy Trust ───────────────────────────────────────────────────────
// Required for Render / Vercel / AWS / Cloudflare reverse proxies to correctly identify
// HTTPS protocol (req.secure), client IP (req.ip), and forward secure cookies.
if (env.nodeEnv === 'production') {
  const trustProxySetting = process.env.TRUST_PROXY;
  if (trustProxySetting === 'true') {
    app.set('trust proxy', true);
  } else if (trustProxySetting && !isNaN(Number(trustProxySetting))) {
    app.set('trust proxy', Number(trustProxySetting));
  } else {
    app.set('trust proxy', 1);
  }
}

// ── CORS Configuration ────────────────────────────────────────────────────────
// Sanitize configured origins: strip trailing slashes, allow comma-separated entries
const configuredOrigins = (env.frontendUrl || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, health probes)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      // Allow configured frontend origin(s)
      if (configuredOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow local development / local testing of production build
      if (
        env.nodeEnv !== 'production' ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // Origin not permitted
      return callback(null, false);
    },
    credentials: true, // Allow cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
  }),
);

// ── Body & Cookie Parsers ────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/notes', noteRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/admin', adminRouter);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
