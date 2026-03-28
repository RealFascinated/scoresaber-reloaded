import { env } from "@ssr/common/env";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, { schema: { ...schema } });
