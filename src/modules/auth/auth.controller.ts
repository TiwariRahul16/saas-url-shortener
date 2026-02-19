import { Request, Response } from "express";
import { authService } from "./auth.service";

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
        });
      }

      const tokens = await authService.register({ email, password });

      return res.status(201).json(tokens);
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Registration failed",
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
        });
      }

      const tokens = await authService.login({ email, password });

      return res.status(200).json(tokens);
    } catch (error: any) {
      return res.status(401).json({
        message: error.message || "Login failed",
      });
    }
  },
};
