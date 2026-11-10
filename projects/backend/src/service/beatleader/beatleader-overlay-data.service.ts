import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { computeAccuracyBySecond } from "@ssr/common/replay/replay-accuracy";
import { ReplayDecoder } from "@ssr/common/replay/replay-decoder";
import type { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import type { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import type { BeatLeaderOverlayDataResponse } from "@ssr/common/schemas/response/beatleader/overlay-data";
import { BeatLeaderPbotRepository } from "../../repositories/beatleader-pbot.repository";
import { BeatLeaderScoresRepository } from "../../repositories/beatleader-scores.repository";
import { PlayerReplayService } from "../player/player-replay.service";
import BeatLeaderService from "./beatleader.service";

const logger = Logger.withTopic("BeatLeader Overlay Data");

/** Stored values are accuracy x 100. */
const STORED_ACCURACY_SCALE = 100;

export class BeatLeaderOverlayDataService {
  /** Replays that are being decoded right now, so a burst of overlays decodes a replay once. */
  private static readonly inFlight = new Map<number, Promise<(number | null)[]>>();

  /**
   * Gets what the overlay needs from a BeatLeader score: its accuracy for each second of the song.
   * The first request of a score decodes its replay and stores the result, later ones read the database.
   *
   * @param scoreId the BeatLeader score id
   */
  public static async getByScoreId(scoreId: number): Promise<BeatLeaderOverlayDataResponse> {
    const stored = await BeatLeaderPbotRepository.findAccuracyBySecond(scoreId);
    if (stored) {
      return this.toResponse(scoreId, stored);
    }

    const score = await BeatLeaderService.getBeatLeaderScore(scoreId);
    if (!score) {
      throw new NotFoundError(`BeatLeader score "${scoreId}" not found`);
    }
    if (!score.savedReplay) {
      // There is no replay to decode, the only accuracy we know is the full combo accuracy
      return { scoreId, source: "final-only", finalAccuracy: score.fcAccuracy, accuracyBySecond: [] };
    }

    return this.toResponse(scoreId, await this.decode(scoreId));
  }

  /**
   * Gets the overlay data of the best score of a player on a map.
   *
   * @param playerId the player
   * @param hash the hash of the map
   * @param difficulty the difficulty of the map
   * @param characteristic the characteristic of the map
   */
  public static async getByPlayerAndMap(
    playerId: string,
    hash: string,
    difficulty: string,
    characteristic: string
  ): Promise<BeatLeaderOverlayDataResponse> {
    const row = await BeatLeaderScoresRepository.findBestBySong(
      playerId,
      hash.toUpperCase(),
      difficulty as MapDifficulty,
      characteristic as MapCharacteristic
    );
    if (!row) {
      throw new NotFoundError(`No BeatLeader score found for player "${playerId}" on this map`);
    }
    return this.getByScoreId(row.id);
  }

  private static decode(scoreId: number): Promise<(number | null)[]> {
    const existing = this.inFlight.get(scoreId);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      const replayUrl = await PlayerReplayService.getPlayerReplayUrl(String(scoreId));
      const replay = await ReplayDecoder.decodeReplay(replayUrl);
      const accuracyBySecond = computeAccuracyBySecond(replay);
      await BeatLeaderPbotRepository.insert(scoreId, accuracyBySecond);
      logger.info(`Stored accuracy by second of score ${scoreId} (${accuracyBySecond.length}s)`);
      return accuracyBySecond;
    })().finally(() => this.inFlight.delete(scoreId));

    this.inFlight.set(scoreId, promise);
    return promise;
  }

  private static toResponse(scoreId: number, stored: (number | null)[]): BeatLeaderOverlayDataResponse {
    const accuracyBySecond = stored.map(value => (value === null ? null : value / STORED_ACCURACY_SCALE));
    let finalAccuracy = 0;
    for (let i = accuracyBySecond.length - 1; i >= 0; i--) {
      const value = accuracyBySecond[i];
      if (value !== null) {
        finalAccuracy = value;
        break;
      }
    }
    return { scoreId, source: "replay", finalAccuracy, accuracyBySecond };
  }
}
