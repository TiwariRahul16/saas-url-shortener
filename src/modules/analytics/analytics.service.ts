import { redisClient } from "../../shared/redis/redis";
import { prisma } from "../../shared/database/prisma";
import { decodeId } from "../../shared/utils/hashids";

export async function syncClickCounts() {
  const keys = await redisClient.keys("clicks:*");

  for (const key of keys) {
    const shortCode = key.split(":")[1];
    const countStr = await redisClient.get(key);

    if (!countStr) continue;

    const count = Number(countStr);
    const id = decodeId(shortCode);

    if (!id) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.analyticsDaily.upsert({
      where: {
        urlId_date: {
          urlId: BigInt(id),
          date: today,
        },
      },
      update: {
        totalClicks: {
          increment: count,
        },
      },
      create: {
        urlId: BigInt(id),
        date: today,
        totalClicks: count,
      },
    });

    // Reset counter
    await redisClient.del(key);
  }

  console.log("✅ Analytics sync completed");
}



export async function getUrlAnalytics(userId: string, urlId: bigint) {
  // Verify URL belongs to user
  const url = await prisma.url.findUnique({
    where: { id: urlId },
  });

  if (!url || url.userId !== userId) {
    throw new Error("Unauthorized access to analytics");
  }

  const analytics = await prisma.analyticsDaily.findMany({
    where: { urlId },
    orderBy: { date: "asc" },
  });

  return analytics;
}
