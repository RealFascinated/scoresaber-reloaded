/**
 * Loads all `scoresaber-leaderboards` ids into a `Set` once, then paginates ScoreSaber
 * `GET /api/leaderboards` via {@link ScoreSaberApiService.lookupLeaderboards} (optional `--search=`).
 * For each list item whose id is not in the set, calls {@link LeaderboardCoreService.createLeaderboard}
 * and adds the id to the set (so we avoid per-row DB existence checks).
 * Passes the list token through so we do not re-fetch by id. Uses `skipScoreSeedQueue` so this
 * CLI does not require `QueueManager` / Redis workers.
 *
 * Usage (from projects/backend):
 *   bun run scripts/create-missing-scoresaber-leaderboards.ts
 *   bun run scripts/create-missing-scoresaber-leaderboards.ts --dry-run
 *   bun run scripts/create-missing-scoresaber-leaderboards.ts --search=Camellia
 *   bun run scripts/create-missing-scoresaber-leaderboards.ts --limit=500 --max-pages=20
 */
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import "dotenv/config";
import { db } from "../src/db";
import { scoreSaberLeaderboardsTable } from "../src/db/schema";
import { LeaderboardCoreService } from "../src/service/leaderboard/leaderboard-core.service";
import { ScoreSaberApiService } from "../src/service/scoresaber-api.service";

async function loadExistingLeaderboardIds(): Promise<Set<number>> {
  const rows = await db.select({ id: scoreSaberLeaderboardsTable.id }).from(scoreSaberLeaderboardsTable);
  return new Set(rows.map(r => r.id));
}

function parseDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

function parseSearch(argv: string[]): string | undefined {
  const raw = argv.find(a => a.startsWith("--search="));
  if (!raw) {
    return undefined;
  }
  const q = raw.slice("--search=".length).trim();
  return q.length > 0 ? q : undefined;
}

function parseLimit(argv: string[]): number | undefined {
  const raw = argv.find(a => a.startsWith("--limit="));
  if (!raw) {
    return undefined;
  }
  const n = Number.parseInt(raw.slice("--limit=".length), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseMaxPages(argv: string[]): number | undefined {
  const raw = argv.find(a => a.startsWith("--max-pages="));
  if (!raw) {
    return undefined;
  }
  const n = Number.parseInt(raw.slice("--max-pages=".length), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function main(): Promise<void> {
  const dryRun = parseDryRun(process.argv);
  const search = parseSearch(process.argv);
  const createLimit = parseLimit(process.argv);
  const maxPages = parseMaxPages(process.argv);

  const existingIds = await loadExistingLeaderboardIds();
  Logger.info(`[create-missing-leaderboards] loaded ${existingIds.size} leaderboard id(s) from DB`);

  let page = 1;
  let totalPages = 1;
  let created = 0;
  let skippedExisting = 0;
  let failed = 0;
  let seen = 0;

  do {
    const response = await ScoreSaberApiService.lookupLeaderboards(page, {
      search,
      priority: CooldownPriority.LOW,
    });

    if (response == null || response.leaderboards.length === 0) {
      if (page === 1) {
        Logger.warn(`[create-missing-leaderboards] no leaderboards on page 1 (search=${search ?? "(none)"})`);
      }
      break;
    }

    totalPages = Math.max(
      1,
      Math.ceil(response.metadata.total / Math.max(1, response.metadata.itemsPerPage))
    );

    if (maxPages != null && page > maxPages) {
      Logger.info(`[create-missing-leaderboards] stopping at --max-pages=${maxPages}`);
      break;
    }

    Logger.info(
      `[create-missing-leaderboards] page ${page}/${totalPages} (items=${response.leaderboards.length}, total=${response.metadata.total})`
    );

    for (const token of response.leaderboards) {
      if (createLimit != null && created >= createLimit) {
        Logger.info(`[create-missing-leaderboards] stopping at --limit=${createLimit} created`);
        Logger.info(
          `[create-missing-leaderboards] done created=${created} skippedExisting=${skippedExisting} failed=${failed} seen=${seen}`
        );
        return;
      }

      seen++;
      const id = token.id;

      if (existingIds.has(id)) {
        skippedExisting++;
        continue;
      }

      if (dryRun) {
        created++;
        continue;
      }

      try {
        await LeaderboardCoreService.createLeaderboard(id, token, { skipScoreSeedQueue: true });
        existingIds.add(id);
        created++;
      } catch (e) {
        const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
        if (code === "23505") {
          existingIds.add(id);
          skippedExisting++;
          continue;
        }
        failed++;
        Logger.error(`[create-missing-leaderboards] id=${id}: ${e}`);
      }
    }

    page++;
  } while (page <= totalPages);

  Logger.info(
    `[create-missing-leaderboards] done created=${created} skippedExisting=${skippedExisting} failed=${failed} seen=${seen}${dryRun ? " (dry-run)" : ""}`
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
