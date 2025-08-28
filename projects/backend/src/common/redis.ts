import { env } from "@ssr/common/env";
import { InternalServerError } from "elysia";
import Redis from "ioredis";

export const redisClient = new Redis(env.REDIS_URL);

export const testRedisConnection = async () => {
  const result = await redisClient.ping();
  if (result !== "PONG") {
    throw new InternalServerError("Failed to connect to Redis");
  }
};
