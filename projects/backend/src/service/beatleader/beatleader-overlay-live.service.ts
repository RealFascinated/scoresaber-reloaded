import { NotFoundError } from "@ssr/common/error/not-found-error";
import type {
  BeatLeaderOverlayPlayerResponse,
  BeatLeaderOverlayRatingsResponse,
} from "@ssr/common/schemas/response/beatleader/overlay-ratings";
import { BeatLeaderApiService } from "../external/beatleader-api.service";

/** BeatLeader's status of a ranked difficulty. */
const RANKED_STATUS = 3;

const RATINGS_TTL_MS = 30 * 60 * 1000;
const PLAYER_TTL_MS = 60 * 1000;

type CacheEntry<T> = { value: T; expiresAt: number };

/**
 * A small in-memory cache that also shares the request between callers asking for the same key at the same time,
 * so a lot of overlays on one map don't each hit the BeatLeader API.
 */
class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number
  ) {}

  public async get(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }

    const request = load()
      .then(value => {
        if (this.entries.size >= this.maxEntries) {
          const oldest = this.entries.keys().next().value;
          if (oldest !== undefined) {
            this.entries.delete(oldest);
          }
        }
        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        return value;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }
}

export class BeatLeaderOverlayLiveService {
  private static readonly ratings = new TtlCache<BeatLeaderOverlayRatingsResponse>(RATINGS_TTL_MS, 500);
  private static readonly players = new TtlCache<BeatLeaderOverlayPlayerResponse>(PLAYER_TTL_MS, 500);

  /**
   * Gets the BeatLeader ratings of a difficulty.
   *
   * @param hash the hash of the map
   * @param difficulty the name of the difficulty, like `ExpertPlus`
   * @param characteristic the characteristic, like `Standard`
   */
  public static getRatings(
    hash: string,
    difficulty: string,
    characteristic: string
  ): Promise<BeatLeaderOverlayRatingsResponse> {
    const key = `${hash.toLowerCase()}:${difficulty}:${characteristic}`;
    return this.ratings.get(key, async () => {
      const response = await BeatLeaderApiService.lookupLeaderboardsByHash(hash);
      const found = response?.leaderboards.find(
        ({ difficulty: entry }) => entry.difficultyName === difficulty && entry.modeName === characteristic
      )?.difficulty;
      if (!found) {
        throw new NotFoundError(
          `BeatLeader difficulty "${difficulty}" ("${characteristic}") of "${hash}" not found`
        );
      }
      return {
        ranked: found.status === RANKED_STATUS,
        stars: found.stars ?? null,
        accRating: found.accRating ?? null,
        passRating: found.passRating ?? null,
        techRating: found.techRating ?? null,
        predictedAcc: found.predictedAcc ?? null,
        sliderPercentage: found.sliderPercentage ?? null,
        notes: found.notes ?? null,
        noteSpan: found.noteSpan ?? null,
      };
    });
  }

  /**
   * Gets the BeatLeader pp and ranks of a player.
   *
   * @param playerId the id of the player
   */
  public static getPlayer(playerId: string): Promise<BeatLeaderOverlayPlayerResponse> {
    return this.players.get(playerId, async () => {
      const player = await BeatLeaderApiService.lookupPlayer(playerId);
      if (!player || player.pp === undefined) {
        throw new NotFoundError(`BeatLeader player "${playerId}" not found`);
      }
      return { pp: player.pp, rank: player.rank ?? 0, countryRank: player.countryRank ?? 0 };
    });
  }
}
