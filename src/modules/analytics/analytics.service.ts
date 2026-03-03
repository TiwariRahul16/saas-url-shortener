import { redisClient } from "../../shared/redis/redis";
import { prisma } from "../../shared/database/prisma";

/**
 * Synchronizes click counts from Redis to the Database.
 * Runs on a background interval defined in server.ts
 */
export async function syncClickCounts() {
  const keys = await redisClient.keys("clicks:*");

  for (const key of keys) {
    const shortCode = key.split(":")[1];

    /**
     * ATOMIC FIX for Redis v4+:
     * .getSet(key, value) gets the current count and resets it to "0" in one step.
     * This ensures that clicks arriving DURING the sync process are not lost.
     */
    const countStr = await redisClient.getSet(key, "0");
    const count = Number(countStr || 0);

    // Skip if there are no new clicks to sync
    if (count <= 0) continue;

    try {
      // Find the URL by shortCode to support both HashIDs and Custom Aliases
      const urlRecord = await prisma.url.findUnique({
        where: { shortCode },
        select: { id: true }
      });

      if (!urlRecord) {
        console.warn(`[Analytics] No URL found for shortCode: ${shortCode}`);
        continue;
      }

      // Normalize date to the start of the day (Midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      /**
       * DATABASE TRANSACTION
       * Ensures both the main counter and daily stats are updated together.
       */
      await prisma.$transaction([
        // 1. Update total clicks on the main URL record
        prisma.url.update({
          where: { id: urlRecord.id },
          data: { totalClicks: { increment: count } },
        }),
        // 2. Upsert (Update or Insert) the record in AnalyticsDaily
        prisma.analyticsDaily.upsert({
          where: {
            urlId_date: {
              urlId: urlRecord.id,
              date: today,
            },
          },
          update: {
            totalClicks: { increment: count },
          },
          create: {
            urlId: urlRecord.id,
            date: today,
            totalClicks: count,
          },
        }),
      ]);

      console.log(`📊 Synced ${count} clicks for ${shortCode}`);

      // If no new clicks arrived during the DB write, clean up the key
      const currentRedisVal = await redisClient.get(key);
      if (currentRedisVal === "0") {
        await redisClient.del(key);
      }
      
    } catch (error) {
      console.error(`❌ Failed to sync clicks for ${shortCode}:`, error);
      /**
       * ROLLBACK logic:
       * If the DB update fails, we add the clicks back into Redis 
       * so they can be attempted again in the next sync cycle.
       */
      await redisClient.incrBy(key, count);
    }
  }

  console.log("✅ Analytics sync completed");
}

/**
 * Fetches analytics for a specific URL, verifying ownership
 */
export async function getUrlAnalytics(userId: string, urlId: bigint) {
  // Verify URL belongs to the requesting user
  const url = await prisma.url.findUnique({
    where: { id: urlId },
  });

  if (!url || url.userId !== userId) {
    throw new Error("Unauthorized access to analytics");
  }

  const analytics = await prisma.analyticsDaily.findMany({
    where: { urlId },
    orderBy: { date: "desc" }, // Newest data first
  });

  return analytics;
}