import app from "./app";
import { env } from "./config/env";
import { prisma } from "./shared/database/prisma";
import { redisClient } from "./shared/redis/redis";
import { syncClickCounts } from "./modules/analytics/analytics.service";


async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    await redisClient.connect();
    console.log("✅ Redis connected successfully");

    // Background analytics sync
    setInterval(async () => {
      try {
        await syncClickCounts();
      } catch (error) {
        console.error("❌ Analytics sync failed", error);
      }
    }, 60000);

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server", error);
    process.exit(1);
  }
}


startServer();


// import app from "./app";
// import { env } from "./config/env";
// import { prisma } from "./shared/database/prisma";

// async function startServer() {
//   try {
//     await prisma.$connect();
//     console.log("✅ Database connected successfully");

//     app.listen(env.PORT, () => {
//       console.log(`🚀 Server running on http://localhost:${env.PORT}`);
//     });
//   } catch (error) {
//     console.error("❌ Failed to connect to database", error);
//     process.exit(1);
//   }
// }

// startServer();





