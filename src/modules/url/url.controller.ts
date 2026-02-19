import { Response } from "express";
import { urlService } from "./url.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { getUserDashboard } from "./url.service";
import { softDeleteUrl } from "./url.service";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { AppError } from "../../shared/middleware/error.middleware";


export const urlController = {
  async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { originalUrl, customAlias, expiresAt } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!originalUrl) {
        return res.status(400).json({ message: "Original URL is required" });
      }

      const result = await urlService.createShortUrl(
        userId,
        originalUrl,
        customAlias,
        expiresAt ? new Date(expiresAt) : undefined
      );


      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Failed to create short URL",
      });
    }
  },

  async redirect(req: any, res: Response) {
    try {
      const { shortCode } = req.params;

      const originalUrl =
        await urlService.getOriginalUrlFromShortCode(shortCode);

      return res.redirect(originalUrl);
    } catch (error: any) {
      return res.status(404).json({
        message: error.message || "URL not found",
      });
    }
  },


async getMyUrls(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    const dashboard = await getUserDashboard(
      userId,
      page,
      limit,
      search
    );

    return res.status(200).json(dashboard);
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "Failed to fetch dashboard data",
    });
  }
},


deleteUrl: asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const urlId = req.params.urlId as string;

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const result = await softDeleteUrl(userId, BigInt(urlId));

  res.status(200).json({
    success: true,
    data: result,
  });
}),



};
