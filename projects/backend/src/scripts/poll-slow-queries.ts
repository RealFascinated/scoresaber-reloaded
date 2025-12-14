import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { mongoose } from "@typegoose/typegoose";

dotenv.config();

interface SlowQuery {
  opid: number;
  ns: string;
  op: string;
  command: Record<string, unknown>;
  secs_running: number;
  microsecs_running: number;
  numYields: number;
  planSummary?: string;
  queryShapeHash?: string;
  client?: string;
}

const SLOW_QUERY_THRESHOLD_MS = 10;
const POLL_INTERVAL_MS = 50;

async function getSlowQueries(): Promise<SlowQuery[]> {
  if (!mongoose.connection.db) {
    throw new Error("MongoDB connection not established");
  }

  // Get all active operations, then filter in code
  const result = await mongoose.connection.db.admin().command({
    currentOp: 1,
    active: true,
  });

  const inprog = (result.inprog as unknown[]) || [];
  
  return inprog
    .filter((op: unknown): op is SlowQuery => {
      const opObj = op as SlowQuery;
      
      // Only include query/command/getmore operations
      if (opObj.op !== "query" && opObj.op !== "command" && opObj.op !== "getmore") {
        return false;
      }
      
      // Filter by duration
      const durationMs = opObj.microsecs_running / 1000;
      if (durationMs < SLOW_QUERY_THRESHOLD_MS) {
        return false;
      }
      
      // Must have required fields
      return !!(opObj.ns && opObj.command);
    })
    .sort((a, b) => b.microsecs_running - a.microsecs_running);
}

function formatQuery(query: SlowQuery): string {
  const duration = (query.microsecs_running / 1000).toFixed(2);
  const secs = query.secs_running.toFixed(2);
  const collection = query.ns.split(".").pop() || query.ns;

  let output = `\n${"=".repeat(80)}\n`;
  output += `🐌 SLOW QUERY DETECTED\n`;
  output += `${"=".repeat(80)}\n`;
  output += `Collection: ${collection}\n`;
  output += `Operation: ${query.op}\n`;
  output += `Duration: ${duration}ms (${secs}s)\n`;
  output += `Yields: ${query.numYields}\n`;
  if (query.planSummary) {
    output += `Plan: ${query.planSummary}\n`;
  }
  if (query.queryShapeHash) {
    output += `Query Hash: ${query.queryShapeHash}\n`;
  }
  if (query.client) {
    output += `Client: ${query.client}\n`;
  }
  output += `\nCommand:\n${JSON.stringify(query.command, null, 2)}\n`;
  output += `${"=".repeat(80)}\n`;

  return output;
}

async function main() {
  try {
    Logger.info("Connecting to MongoDB...");
    await mongoose.connect(env.MONGO_CONNECTION_STRING);
    Logger.info("Connected to MongoDB");
    Logger.info(`Polling for slow queries (threshold: ${SLOW_QUERY_THRESHOLD_MS}ms, interval: ${POLL_INTERVAL_MS}ms)`);
    Logger.info("Press Ctrl+C to stop\n");

    const seenQueries = new Set<string>();
    let iteration = 0;

    while (true) {
      try {
        const slowQueries = await getSlowQueries();

        if (slowQueries.length > 0) {
          for (const query of slowQueries) {
            // Create a unique key for this query to avoid spam (use opid to track same query)
            const queryKey = `${query.opid}-${query.ns}-${query.op}`;
            
            if (!seenQueries.has(queryKey)) {
              seenQueries.add(queryKey);
              console.log(formatQuery(query));
            }
          }
        } else {
          process.stdout.write(".");
        }

        // Debug: log total operations every 20 iterations
        if (iteration % 20 === 0 && iteration > 0) {
          try {
            const allOps = await mongoose.connection.db?.admin().command({ currentOp: 1, active: true });
            const totalOps = (allOps?.inprog as unknown[])?.length || 0;
            Logger.info(`\n[Debug] Total active operations: ${totalOps}, Slow queries found: ${slowQueries.length}`);
          } catch {
            // Ignore debug errors
          }
        }
        iteration++;

        // Clean up old seen queries (keep last 100)
        if (seenQueries.size > 100) {
          const entries = Array.from(seenQueries);
          seenQueries.clear();
          entries.slice(-50).forEach(key => seenQueries.add(key));
        }
      } catch (error) {
        Logger.error("Error polling slow queries:", error);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } catch (error) {
    Logger.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  Logger.info("\nShutting down...");
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    Logger.info("MongoDB connection closed");
  }
  process.exit(0);
});

main().catch(error => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});

