import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import Redis from "ioredis";

const logger = Logger.withTopic("Redis");
logger.info("Connecting to Redis...");
export const redisClient = new Redis(env.REDIS_URL);
redisClient.on("ready", () => logger.info("Connected to Redis :)"));
redisClient.on("error", error => logger.error("Redis error:", error));
