import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { InternalServerError } from "elysia";
import Redis from "ioredis";

const logger = Logger.withTopic("Redis");
logger.info("Connecting to Redis...");
export const redisClient = new Redis(env.REDIS_URL);
redisClient.on("ready", () => logger.info("Connected to Redis :)"));
redisClient.on("error", error => logger.error("Redis error:", error));

export const testRedisConnection = async () => {
  const result = await redisClient.ping();
  if (result !== "PONG") {
    throw new InternalServerError("Failed to connect to Redis");
  }
};
