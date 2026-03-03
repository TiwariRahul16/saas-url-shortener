import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser"; // 1. Import cookie-parser
import authRoutes from "./modules/auth/auth.routes";
import urlRoutes from "./modules/url/url.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import { globalErrorHandler } from "./shared/middleware/error.middleware";
import {env} from "./config/env"

const app = express();

/**
 * SECURITY MIDDLEWARE
 */
app.use(helmet());

// 2. Configure CORS for Production
// When using cookies (HttpOnly), credentials must be true
app.use(
  cors({
    origin: env.FRONTEND_URL, 
    credentials: true,
  })
);

// 3. Parse Cookies & JSON bodies
app.use(cookieParser()); // Required to read the refresh token cookie
app.use(express.json());

/**
 * ROUTES
 */

// Health check (Cleaned up duplicates)
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// Module Routes
app.use("/api/auth", authRoutes);
app.use("/api/urls", urlRoutes);
app.use("/api/analytics", analyticsRoutes);

/**
 * ERROR HANDLING
 */
app.use(globalErrorHandler);

export default app;