import { Request, Response, NextFunction } from "express";
import { redisClient } from "../redis/redis";

interface RateLimitOptions {
  windowInSeconds: number;
  maxRequests: number | ((req: Request) => number);
  keyGenerator: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = options.keyGenerator(req);

      const max =
        typeof options.maxRequests === "function"
          ? options.maxRequests(req)
          : options.maxRequests;

      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, options.windowInSeconds);
      }

      if (current > max) {
        return res.status(429).json({
          message: "Too many requests. Please try again later.",
        });
      }

      next();
    } catch (error) {
      console.error("Rate limit error:", error);
      next();
    }
  };
}


// import { Request, Response, NextFunction } from "express";
// import { redisClient } from "../redis/redis";

// interface RateLimitOptions {
//   windowInSeconds: number;
//   maxRequests: number;
//   keyGenerator: (req: Request) => string;
// }

// export function rateLimit(options: RateLimitOptions) {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const key = options.keyGenerator(req);

//       const current = await redisClient.incr(key);

//       if (current === 1) {
//         await redisClient.expire(key, options.windowInSeconds);
//       }

//       if (current > options.maxRequests) {
//         return res.status(429).json({
//           message: "Too many requests. Please try again later.",
//         });
//       }

//       next();
//     } catch (error) {
//       console.error("Rate limit error:", error);
//       next();
//     }
//   };
// }
