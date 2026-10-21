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

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true, // Required to accept cookies from the frontend origin
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parses cookies so auth middleware can read them

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
