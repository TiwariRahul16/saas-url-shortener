import { Router } from "express";
import { urlController } from "./url.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { rateLimit } from "../../shared/middleware/rateLimit.middleware";


const router = Router();

const redirectRateLimit = rateLimit({
  windowInSeconds: 60, // 1 minute window
  maxRequests: 100,    // max 100 requests per minute per IP
  keyGenerator: (req) => `rate:ip:${req.ip}`,
});

const createUrlRateLimit = rateLimit({
  windowInSeconds: 60,
  maxRequests: (req: any) => {
    const role = req.user?.role;

    if (role === "PRO") return 200;
    if (role === "ADMIN") return 1000;

    return 20; // FREE default
  },
  keyGenerator: (req: any) => `rate:user:${req.user?.userId}`,
});



// Create short URL (protected)
router.post(
  "/",
  authMiddleware,
  createUrlRateLimit,
  urlController.create
);


router.get("/my", authMiddleware, urlController.getMyUrls);

router.delete("/:urlId", authMiddleware, urlController.deleteUrl);

// Redirect route (public)
router.get("/:shortCode", redirectRateLimit, urlController.redirect);



export default router;
