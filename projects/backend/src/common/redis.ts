import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { InternalServerError } from "elysia";
import Redis from "ioredis";

Logger.info("Testing Redis connection...");
export const redisClient = new Redis(env.REDIS_URL);
Logger.info("Connected to Redis :)");

export const testRedisConnection = async () => {
  const result = await redisClient.ping();
  if (result !== "PONG") {
    throw new InternalServerError("Failed to connect to Redis");
  }
};
