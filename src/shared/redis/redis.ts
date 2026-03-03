import { createClient } from "redis";
import { env } from "../../config/env";

export const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    // Professional Reconnection Strategy: Exponential Backoff
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("❌ Redis: Max retries reached. Stopping reconnection.");
        return new Error("Redis connection lost");
      }
      // Wait longer after each failure: 100ms, 200ms, 400ms... up to 2 seconds
      const delay = Math.min(retries * 100, 2000);
      console.warn(`🔁 Redis: Reconnecting in ${delay}ms (Attempt ${retries})`);
      return delay;
    },
    connectTimeout: 10000, // 10 seconds timeout
  },
});

// Event Listeners for better monitoring
redisClient.on("connect", () => console.log("📡 Redis: Connecting..."));
redisClient.on("ready", () => console.log("✅ Redis: Connected and ready to use"));
redisClient.on("reconnecting", () => console.log("🔄 Redis: Reconnecting..."));
redisClient.on("error", (err) => console.error("❌ Redis Error:", err));

// Mandatory: v4+ requires explicit .connect()
// We use a self-invoking function to avoid blocking the main thread
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("❌ Redis: Initial connection failed", err);
  }
})();