import app from "./app";
import { env } from "./config/env";
import { prisma } from "./shared/database/prisma";
import { redisClient } from "./shared/redis/redis";
import { syncClickCounts } from "./modules/analytics/analytics.service";

async function startServer() {
  try {
    // 1. Database Connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Note: redisClient.connect() is now handled inside shared/redis/redis.ts 
    // to ensure the client is ready as soon as it's imported.

    // 2. Background analytics sync (Every 60 seconds)
    const syncInterval = setInterval(async () => {
      try {
        await syncClickCounts();
      } catch (error) {
        console.error("❌ Analytics sync failed", error);
      }
    }, 60000);

    // 3. Start Express Server
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });

    /**
     * GRACEFUL SHUTDOWN LOGIC
     * Professional standard: Ensure no data loss when the server stops/restarts
     */
    const shutdown = async (signal: string) => {
      console.log(`\n shadowing ${signal} received. Starting graceful shutdown...`);
      
      clearInterval(syncInterval); // Stop the background sync timer

      server.close(async () => {
        console.log("🛑 HTTP server closed.");
        
        try {
          // Final sync attempt before closing
          console.log("⏳ Performing final analytics sync...");
          await syncClickCounts();
          
          await prisma.$disconnect();
          console.log("🔌 Database disconnected.");
          
          await redisClient.quit();
          console.log("🔌 Redis disconnected.");
          
          process.exit(0);
        } catch (err) {
          console.error("❌ Error during shutdown:", err);
          process.exit(1);
        }
      });
    };

    // Listen for termination signals (Sent by Render/Docker during redeploy)
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("❌ Failed to start server", error);
    process.exit(1);
  }
}

startServer();