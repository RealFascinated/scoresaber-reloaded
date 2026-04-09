import { env } from "@ssr/common/env";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 50, // max connections
  min: 10, // min connections
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema: { ...schema } });
