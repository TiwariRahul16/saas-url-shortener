import { Request, Response } from "express";
import { authService } from "./auth.service";
import { env } from "../../config/env";

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const { accessToken, refreshToken } = await authService.register({ email, password });

      // Set Refresh Token in a secure cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true, // Prevents JavaScript access (XSS protection)
        secure: process.env.NODE_ENV === "production", // Only over HTTPS in production
        sameSite: "strict", // CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches your token expiry)
      });

      return res.status(201).json({ accessToken });
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
        return res.status(400).json({ message: "Email and password are required" });
      }

      const { accessToken, refreshToken } = await authService.login({ email, password });

      // Set Refresh Token in a secure cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({ accessToken });
    } catch (error: any) {
      return res.status(401).json({
        message: error.message || "Login failed",
      });
    }
  },

  async logout(req: Request, res: Response) {
    // Clear the cookie on logout
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out successfully" });
  }
};