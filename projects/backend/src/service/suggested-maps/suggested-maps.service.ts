import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import {
  DEFAULT_SUGGESTED_MAPS_PARAMS,
  estimatePlayerSkill,
  predictAccuracy,
  scoreWeight,
} from "@ssr/common/suggested-maps/suggested-maps-model";
import { Cron } from "croner";
import { eq } from "drizzle-orm";
import { SHARE_ENV } from "node:worker_threads";
import { db } from "../../db";
import { scoreSaberLeaderboardSuggestedMapsTable } from "../../db/schema";
import { listPlayerScores, listRankedMaps } from "./suggested-maps-data";
import type { SuggestedMapsFitResult } from "./suggested-maps-fit.worker";
import {
  derivePlayerStyle,
  getReferenceSkill,
  rankSuggestedMaps,
  type PlayerMapScore,
  type PlayerStyle,
  type RankableMap,
  type SuggestedMapsFilters,
} from "./suggested-maps-ranking";

const DEFAULT_FILTERS: SuggestedMapsFilters = {
  minStars: 0,
  maxStars: 20,
  minSeconds: 0,
  maxSeconds: Number.POSITIVE_INFINITY,
  maxNps: Number.POSITIVE_INFINITY,
  minScores: 30,
  hidePlayed: false,
  sort: "gain",
  limit: 50,
};

const MAP_CACHE_TTL_MS = 10 * 60 * 1000;

// WARNING: compiled binaries embed the worker relative to src/ (it must be a build entrypoint), not to this file.
const FIT_WORKER_PATH = Bun.main.startsWith("/$bunfs/")
  ? "./service/suggested-maps/suggested-maps-fit.worker.ts"
  : new URL("./suggested-maps-fit.worker.ts", import.meta.url).href;

type MapCache = { maps: RankableMap[]; updatedAt: Date; weightScale: number; loadedAt: number };

export class SuggestedMapsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("SuggestedMaps");
  private static cache: MapCache | undefined;
  private static refreshing: Promise<void> | undefined;

  /**
   * Refits the maps every day, outside of the app's cron plugin chain (which is at the compiler's type depth limit).
   */
  public static scheduleRefresh() {
    new Cron("0 4 * * *", { name: "refresh-suggested-maps", timezone: "UTC", protect: true }, async () => {
      try {
        await this.refresh();
      } catch (error) {
        this.logger.error("Failed to refresh the suggested maps:", error);
      }
    });
    this.getMaps().catch(error => this.logger.error("Failed to warm the suggested maps:", error));
  }

  /**
   * Refits the model over every ranked score and stores the map eases. Takes about a minute, so it runs
   * from a cron job and never from a request.
   */
  public static refresh() {
    this.refreshing ??= this.runRefresh().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }

  private static async runRefresh() {
    const fit = await runFitWorker();
    this.cache = undefined;
    this.logger.info(
      `Fitted ${fit.scoreCount} scores of ${fit.playerCount} players on ${fit.mapCount} maps (load ${(
        fit.loadMs / 1000
      ).toFixed(1)}s, fit ${(fit.fitMs / 1000).toFixed(1)}s)`
    );
  }

  private static async getMaps() {
    if (this.cache && Date.now() - this.cache.loadedAt < MAP_CACHE_TTL_MS) {
      return this.cache;
    }
    const [maps, rows] = await Promise.all([
      listRankedMaps(),
      db
        .select()
        .from(scoreSaberLeaderboardSuggestedMapsTable)
        .where(eq(scoreSaberLeaderboardSuggestedMapsTable.realmId, DEFAULT_REALM_ID)),
    ]);
    const byId = new Map(rows.map(row => [row.leaderboardId, row]));
    const rankable: RankableMap[] = [];
    let updatedAt = new Date(0);
    let weightScale = 1;
    for (const map of maps) {
      const row = byId.get(map.leaderboardId);
      if (!row) {
        continue;
      }
      if (row.updatedAt > updatedAt) {
        updatedAt = row.updatedAt;
        weightScale = row.weightScale;
      }
      rankable.push({ ...map, ease: row.ease, prior: row.prior, scoreCount: row.scoreCount });
    }
    if (rankable.length === 0) {
      this.refresh().catch(error =>
        this.logger.error("Failed to run the first suggested maps refresh:", error)
      );
      return { maps: [], updatedAt, weightScale, loadedAt: 0 };
    }
    this.cache = { maps: rankable, updatedAt, weightScale, loadedAt: Date.now() };
    return this.cache;
  }

  /**
   * Ranks ranked maps by how much pp they offer a player (or a reference player) over maps of the same stars.
   */
  public static async getSuggestedMaps(
    options: Partial<SuggestedMapsFilters> & {
      playerId?: string;
      referenceAccuracy?: number;
      daily?: boolean;
    }
  ) {
    const params = DEFAULT_SUGGESTED_MAPS_PARAMS;
    const { maps, updatedAt, weightScale } = await this.getMaps();
    const { daily, ...filterOptions } = options;
    const explicit = stripUndefined(filterOptions);

    let skill: number;
    let slope = 0;
    let playerScores: Map<number, PlayerMapScore> | null = null;
    let playerPps: number[] | null = null;
    let playerSkill: number | null = null;
    let style: PlayerStyle | null = null;

    if (options.playerId) {
      const scores = await listPlayerScores(options.playerId);
      const easeById = new Map(maps.map(map => [map.leaderboardId, map]));
      const fit = estimatePlayerSkill(
        scores.flatMap(score => {
          const map = easeById.get(score.leaderboardId);
          return map
            ? [
                {
                  ease: map.ease,
                  stars: map.stars,
                  accuracy: score.accuracy,
                  weight: scoreWeight(score, params),
                },
              ]
            : [];
        }),
        params,
        weightScale
      );
      skill = fit.skill;
      slope = fit.slope;
      playerSkill = fit.skill;
      playerScores = new Map(
        scores.map(score => [score.leaderboardId, { pp: score.pp, accuracy: score.accuracy }])
      );
      playerPps = scores.map(score => score.pp);
      style = derivePlayerStyle(
        scores.flatMap(score => {
          const map = easeById.get(score.leaderboardId);
          return map
            ? [
                {
                  stars: map.stars,
                  seconds: map.seconds,
                  nps: map.nps,
                  ageDays: score.ageDays,
                  accuracy: score.accuracy,
                  residual: score.accuracy - predictAccuracy(fit.skill, fit.slope, map.stars, map.ease),
                },
              ]
            : [];
        })
      );
    } else {
      skill = getReferenceSkill(options.referenceAccuracy ?? 97.5, maps, params);
    }

    const filters: SuggestedMapsFilters = { ...DEFAULT_FILTERS, ...style?.ranges, ...explicit };

    return {
      playerSkill,
      playerRanges: style?.ranges
        ? {
            ...style.ranges,
            maxSeconds: Number.isFinite(style.ranges.maxSeconds) ? style.ranges.maxSeconds : null,
            maxNps: Number.isFinite(style.ranges.maxNps) ? style.ranges.maxNps : null,
          }
        : null,
      updatedAt: updatedAt.toISOString(),
      maps: rankSuggestedMaps({
        maps,
        skill,
        slope,
        params,
        filters,
        playerScores,
        playerPps,
        style,
        shuffleSeed: daily ? new Date().toISOString().slice(0, 10) : undefined,
      }).map(({ bonusPp: _bonusPp, ...map }) => map),
    };
  }
}

function runFitWorker() {
  return new Promise<SuggestedMapsFitResult>((resolve, reject) => {
    const worker = new Worker(FIT_WORKER_PATH, { env: SHARE_ENV });
    worker.onmessage = (event: MessageEvent<SuggestedMapsFitResult>) => {
      resolve(event.data);
      worker.terminate();
    };
    worker.onerror = event => {
      reject(new Error(`The suggested maps fit worker failed: ${event.message}`));
      worker.terminate();
    };
  });
}

function stripUndefined<T extends object>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
