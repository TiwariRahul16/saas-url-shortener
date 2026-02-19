import { Router } from "express";
import { authController } from "./auth.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";


const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

router.get("/me", authMiddleware, (req: any, res) => {
  res.status(200).json({
    message: "Protected route accessed",
    user: req.user,
  });
});


export default router;
