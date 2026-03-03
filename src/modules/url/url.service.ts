import { urlRepository } from "./url.repository";
import { encodeId, decodeId } from "../../shared/utils/hashids";
import { redisClient } from "../../shared/redis/redis";
import { prisma } from "../../shared/database/prisma";
import { AppError } from "../../shared/middleware/error.middleware";

export const urlService = {
  async createShortUrl(
    userId: string,
    originalUrl: string,
    customAlias?: string,
    expiresAt?: Date
  ) {
    // 1. Basic URL Validation
    if (!originalUrl.startsWith("http")) {
      throw new AppError("Invalid URL format. Must start with http or https", 400);
    }

    // SSRF Protection: Prevent shortening the app's own domain to avoid loops
    const blockedHosts = ["saas-url-shortener.onrender.com", "localhost"];
    try {
      const host = new URL(originalUrl).hostname;
      if (blockedHosts.includes(host)) {
        throw new AppError("Cannot shorten URLs from this domain", 400);
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError("Invalid URL format", 400);
    }

    let shortCode: string | undefined;

    if (customAlias) {
      // Check if alias already exists
      const existing = await prisma.url.findUnique({
        where: { shortCode: customAlias },
      });

      if (existing) {
        throw new AppError("Custom alias already in use", 400);
      }
      shortCode = customAlias;
    }

    // 2. Create DB record
    const url = await urlRepository.createUrl(
      userId,
      originalUrl,
      expiresAt
    );

    // 3. If no custom alias → generate from generated database ID
    if (!customAlias) {
      shortCode = encodeId(url.id);
    }

    // 4. Update DB with the final shortCode
    await prisma.url.update({
      where: { id: url.id },
      data: { shortCode },
    });

    return {
      shortCode: shortCode!,
      originalUrl: url.originalUrl,
      expiresAt: url.expiresAt,
    };
  },

  async getOriginalUrlFromShortCode(shortCode: string) {
    const cacheKey = `url:${shortCode}`;
    const clickKey = `clicks:${shortCode}`;

    // 1️⃣ Check Redis cache first
    const cachedUrl = await redisClient.get(cacheKey);
    if (cachedUrl) {
      // Increment click counter in Redis (sync process will move this to DB later)
      await redisClient.incr(clickKey);
      return cachedUrl;
    }

    // 2️⃣ Check DB by shortCode (Works for both Aliases and HashIDs)
    const urlRecord = await prisma.url.findUnique({
      where: { shortCode, isDeleted: false },
    });

    if (!urlRecord) {
      throw new AppError("URL not found or has been deleted", 404);
    }

    // Check Expiration
    if (urlRecord.expiresAt && new Date() > urlRecord.expiresAt) {
      throw new AppError("URL has expired", 410);
    }

    // 3️⃣ Cache the result and register the click
    // We convert BigInt to string for JSON compatibility
    await redisClient.set(cacheKey, urlRecord.originalUrl, {
      EX: 3600, // Cache for 1 hour
    });

    await redisClient.incr(clickKey);

    return urlRecord.originalUrl;
  }
};

/**
 * Get User Dashboard with Pagination and Search
 */
export async function getUserDashboard(
  userId: string,
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;

  const whereClause: any = {
    userId,
    isDeleted: false,
  };

  if (search) {
    whereClause.originalUrl = {
      contains: search,
      mode: "insensitive",
    };
  }

  const [urls, totalCount] = await Promise.all([
    prisma.url.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.url.count({
      where: whereClause,
    }),
  ]);

  // Transform data for the frontend
  const data = urls.map((url) => ({
    id: url.id.toString(), // Convert BigInt to string for JSON
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    createdAt: url.createdAt,
    expiresAt: url.expiresAt,
    totalClicks: url.totalClicks, // Now directly available in the model
  }));

  return {
    data,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Soft delete a URL
 */
export async function softDeleteUrl(userId: string, urlId: bigint) {
  const url = await prisma.url.findUnique({
    where: { id: urlId },
  });

  if (!url || url.userId !== userId) {
    throw new AppError("Unauthorized or URL not found", 404);
  }

  // Clear cache so the shortened link stops working immediately
  if (url.shortCode) {
    await redisClient.del(`url:${url.shortCode}`);
  }

  await prisma.url.update({
    where: { id: urlId },
    data: { isDeleted: true },
  });

  return { message: "URL deleted successfully" };
}