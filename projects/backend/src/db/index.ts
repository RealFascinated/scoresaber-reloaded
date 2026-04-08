import { env } from "@ssr/common/env";
import { SQL } from "bun";
import "dotenv/config";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

const client = new SQL({
  url: env.DATABASE_URL,
  max: 50, // max connections in pool
  connectionTimeout: 2, // seconds (timeout when establishing new connections)
});

export const db = drizzle({ client, schema: { ...schema } });
