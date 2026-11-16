import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { SuggestedMapsResponse } from "@ssr/common/schemas/suggested-maps/suggested-maps";
import {
  DEFAULT_SUGGESTED_MAPS_PARAMS,
  estimatePlayerSkill,
  fitSuggestedMapsModel,
  scoreWeight,
} from "@ssr/common/suggested-maps/suggested-maps-model";
import { Cron } from "croner";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberLeaderboardSuggestedMapsTable } from "../../db/schema";
import { ScoreSaberLeaderboardSuggestedMapsRepository } from "../../repositories/scoresaber-leaderboard-suggested-maps.repository";
import { listPlayerScores, listRankedMaps, loadFitData } from "./suggested-maps-data";
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

/** How long the in-memory map list is trusted before the table is read again. */
const MAP_CACHE_TTL_MS = 10 * 60 * 1000;

type MapCache = { maps: RankableMap[]; updatedAt: Date; weightScale: number; loadedAt: number };

export class SuggestedMapsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("SuggestedMaps");
  private static cache: MapCache | undefined;
  private static refreshing: Promise<void> | undefined;

  /**
   * Refits the maps every day, outside of the app's cron plugin chain (which is at the compiler's type depth limit).
   */
  public static scheduleRefresh(): void {
    new Cron("0 4 * * *", { name: "refresh-suggested-maps", timezone: "UTC", protect: true }, async () => {
      try {
        await this.refresh();
      } catch (error) {
        this.logger.error("Failed to refresh the suggested maps:", error);
      }
    });
    // Fits right away when nothing has been fitted yet, so the first request does not wait for 04:00.
    this.getMaps().catch(error => this.logger.error("Failed to warm the suggested maps:", error));
  }

  /**
   * Refits the model over every ranked score and stores the map eases. Takes about a minute, so it runs
   * from a cron job and never from a request.
   */
  public static refresh(): Promise<void> {
    // Share a refresh that is already running.
    this.refreshing ??= this.runRefresh().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }

  private static async runRefresh(): Promise<void> {
    const params = DEFAULT_SUGGESTED_MAPS_PARAMS;
    const before = Date.now();
    const maps = await listRankedMaps();
    const data = await loadFitData(maps, params);
    const loadedAt = Date.now();
    const model = fitSuggestedMapsModel(data, params);
    const updatedAt = new Date();

    await ScoreSaberLeaderboardSuggestedMapsRepository.replaceRealm(
      DEFAULT_REALM_ID,
      maps.map((map, i) => ({
        leaderboardId: map.leaderboardId,
        realmId: DEFAULT_REALM_ID,
        ease: model.ease[i],
        prior: model.prior[i],
        scoreCount: model.mapScores[i],
        weightScale: model.weightScale,
        updatedAt,
      }))
    );
    this.cache = undefined;
    this.logger.info(
      `Fitted ${data.y.length} scores of ${data.playerCount} players on ${maps.length} maps (load ${(
        (loadedAt - before) /
        1000
      ).toFixed(1)}s, fit ${((Date.now() - loadedAt) / 1000).toFixed(1)}s)`
    );
  }

  /**
   * Gets the ranked maps with their stored ease, from memory when fresh.
   */
  private static async getMaps(): Promise<MapCache> {
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
      // First run after the table was added: fit now instead of waiting for the daily job.
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
    options: Partial<SuggestedMapsFilters> & { playerId?: string; referenceAccuracy?: number }
  ): Promise<SuggestedMapsResponse> {
    const params = DEFAULT_SUGGESTED_MAPS_PARAMS;
    const { maps, updatedAt, weightScale } = await this.getMaps();
    const explicit = stripUndefined(options);

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
                },
              ]
            : [];
        })
      );
    } else {
      skill = getReferenceSkill(options.referenceAccuracy ?? 97.5, maps, params);
    }

    // Explicit query values win over the ranges fitted to the player, which win over no limits.
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
      maps: rankSuggestedMaps({ maps, skill, slope, params, filters, playerScores, playerPps, style }),
    };
  }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
