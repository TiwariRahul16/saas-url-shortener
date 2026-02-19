import { Router } from "express";
import { analyticsController } from "./analytics.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

// GET analytics for a specific URL
router.get("/:urlId", authMiddleware, analyticsController.getAnalytics);

export default router;
