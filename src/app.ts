import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes";
import urlRoutes from "./modules/url/url.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import { globalErrorHandler } from "./shared/middleware/error.middleware";


const app = express();
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// Security middleware
app.use(helmet());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/urls", urlRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use(globalErrorHandler);

// Health check route
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});


export default app;





