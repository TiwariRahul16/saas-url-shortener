import { Router } from "express";
import { urlController } from "./url.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { rateLimit } from "../../shared/middleware/rateLimit.middleware";

const router = Router();

/**
 * RATE LIMITING CONFIGURATION
 * Professional SaaS products use tiered rate limiting based on user roles.
 */
const redirectRateLimit = rateLimit({
  windowInSeconds: 60, // 1 minute window
  maxRequests: 100,    // max 100 requests per minute per IP for public redirects
  keyGenerator: (req) => `rate:ip:${req.ip}`,
});

const createUrlRateLimit = rateLimit({
  windowInSeconds: 60,
  maxRequests: (req: any) => {
    const role = req.user?.role;
    if (role === "PRO") return 200;
    if (role === "ADMIN") return 1000;
    return 20; // Default limit for FREE tier
  },
  keyGenerator: (req: any) => `rate:user:${req.user?.userId}`,
});

/**
 * PRO-LEVEL ROUTE ORDERING:
 * 1. Specific Static Routes (e.g., /my) must be defined FIRST.
 * 2. General Parameter Routes (e.g., /:shortCode) must be defined LAST.
 * * This ensures that when you call GET /api/urls/my, Express doesn't treat 
 * "my" as a shortCode and try to redirect to it.
 */

// 1. Create short URL (Protected & Tier-based Rate Limited)
router.post(
  "/",
  authMiddleware,
  createUrlRateLimit,
  urlController.create
);

// 2. User Dashboard (Protected)
// This is now safely placed ABOVE the redirect route
router.get(
  "/my", 
  authMiddleware, 
  urlController.getMyUrls
);

// 3. Delete URL (Protected)
router.delete(
  "/:urlId", 
  authMiddleware, 
  urlController.deleteUrl
);

// 4. Redirect Route (Public - Catch-all for short codes)
// This remains at the bottom so it only triggers if no other routes match
router.get(
  "/:shortCode", 
  redirectRateLimit, 
  urlController.redirect
);

export default router;