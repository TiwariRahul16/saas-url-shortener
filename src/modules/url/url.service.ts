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
  if (!originalUrl.startsWith("http")) {
    throw new AppError("Invalid URL format", 400);
  }

  let shortCode: string | undefined;

  if (customAlias) {
    // Check if alias already exists
    const existing = await prisma.url.findFirst({
    where: { shortCode: customAlias },
    });


    if (existing) {
      throw new Error("Custom alias already in use");
    }

    shortCode = customAlias;
  }

  // Create DB record
  const url = await urlRepository.createUrl(
    userId,
    originalUrl,
    expiresAt
  );

  // If no custom alias → generate from ID
  if (!customAlias) {
    shortCode = encodeId(url.id);
  }

  // Update DB with shortCode
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

  // 1️⃣ Check Redis cache
  const cachedUrl = await redisClient.get(cacheKey);
  if (cachedUrl) {
    await redisClient.incr(clickKey);
    return cachedUrl;
  }

  // 2️⃣ Check if custom alias exists in DB
  const customUrl = await prisma.url.findFirst({
    where: { shortCode },
  });

  if (customUrl) {
    if (customUrl.isDeleted) {
      throw new AppError("URL has been deleted", 410);
    }
    if (customUrl.expiresAt && new Date() > customUrl.expiresAt) {
      throw new Error("URL has expired");
    }

    await redisClient.set(cacheKey, customUrl.originalUrl, {
      EX: 3600,
    });

    await redisClient.incr(clickKey);

    return customUrl.originalUrl;
  }

  // 3️⃣ Otherwise try Hashid decode
  const id = decodeId(shortCode);
  if (!id) {
    throw new AppError("Invalid short code",400);
  }

  const url = await urlRepository.findById(BigInt(id));
  if (!url) {
   throw new AppError("URL not found", 404);
  }

  if (url.isDeleted) {
   throw new AppError("URL has been deleted", 410);
  }


  if (url.expiresAt && new Date() > url.expiresAt) {
    throw new Error("URL has expired");
  }

  await redisClient.set(cacheKey, url.originalUrl, {
    EX: 3600,
  });

  await redisClient.incr(clickKey);

  return url.originalUrl;
}


};



async function getUserDashboard(
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

  const dashboardData = await Promise.all(
    urls.map(async (url) => {
      const totalClicks = await prisma.analyticsDaily.aggregate({
        where: { urlId: url.id },
        _sum: { totalClicks: true },
      });

      return {
        id: url.id.toString(),
        shortCode: url.shortCode || encodeId(url.id),
        originalUrl: url.originalUrl,
        createdAt: url.createdAt,
        expiresAt: url.expiresAt,
        totalClicks: totalClicks._sum.totalClicks || 0,
      };
    })
  );

  return {
    data: dashboardData,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

export { getUserDashboard };


async function softDeleteUrl(userId: string, urlId: bigint) {
  const url = await prisma.url.findUnique({
    where: { id: urlId },
  });

  if (!url || url.userId !== userId) {
    throw new AppError("Unauthorized or URL not found",404);
  }

  if (url.isDeleted) {
    throw new AppError("URL already deleted",410);
  }

  await prisma.url.update({
    where: { id: urlId },
    data: { isDeleted: true },
  });

  return { message: "URL deleted successfully" };
}

export { softDeleteUrl };

