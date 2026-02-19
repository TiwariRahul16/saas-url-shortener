import { Response } from "express";
import { getUrlAnalytics } from "./analytics.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export const analyticsController = {
  async getAnalytics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const urlId = req.params.urlId as string;


      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const analytics = await getUrlAnalytics(
        userId,
        BigInt(urlId)
      );

      const safeAnalytics = analytics.map((item) => ({

        ...item,
        id: item.id.toString(),
        urlId: item.urlId.toString(),
      }));

return res.status(200).json(safeAnalytics);

    } catch (error: any) {
      return res.status(403).json({
        message: error.message || "Failed to fetch analytics",
      });
    }
  },
};
