import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { LeaderboardScoresResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard-scores";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import BeatSaverService from "../external/beatsaver.service";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import { RealmService } from "../realm/realm.service";
import { ScoreCoreService } from "../score/score-core.service";
import { ScoreSaberLeaderboardsService } from "./scoresaber-leaderboards.service";

export class ScoreSaberLeaderboardScoresService {
  /**
   * Gets scores for a leaderboard.
   *
   * @param leaderboardId the leaderboard id
   * @param page the page to get
   * @param country the country to get scores in
   * @param realmId the realm to show pp for
   * @returns the scores
   */
  public static async getLeaderboardScores(
    leaderboardId: number,
    page: number,
    country: string | undefined,
    realmId: number
  ): Promise<LeaderboardScoresResponse | undefined> {
    // The leaderboard and its page of scores don't depend on each other.
    const [leaderboard, leaderboardScores] = await Promise.all([
      ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId, realmId),
      ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, page, { country: country }),
    ]);
    if (leaderboard == undefined) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }
    if (!leaderboardScores) {
      throw new NotFoundError(`Leaderboard scores for leaderboard "${leaderboardId}" not found`);
    }

    // The v1 API only carries the default realm's pp, so that is what gets persisted below. Other
    // realms show pp computed from the realm's stars and curve.
    const defaultRealmScores = leaderboardScores.scores.map(token =>
      getScoreSaberScoreFromToken(token, leaderboard, token.leaderboardPlayerInfo.id)
    );

    // Fire-and-forget: persist scores from the ScoreSaber API without blocking the response
    void ScoreCoreService.upsertScoresFromApi(defaultRealmScores);

    let parsedScores = defaultRealmScores;
    if (realmId !== DEFAULT_REALM_ID) {
      const curve = leaderboard.ranked ? await RealmService.getCalculationCurve(realmId) : undefined;
      parsedScores = defaultRealmScores.map(score => ({
        ...score,
        pp: curve ? ScoreSaberCurve.getPp(leaderboard.stars, score.accuracy, curve) : 0,
      }));
    }

    // The map doesn't need the scores, so it loads while they are enriched.
    const beatSaverPromise = BeatSaverService.getMap(
      leaderboard.songHash,
      leaderboard.difficulty.difficulty,
      leaderboard.difficulty.characteristic
    );
    const playerInfoById = await ScoreCoreService.getPlayerInfoByIds(
      parsedScores.map(score => score.playerId)
    );

    const scores = (
      await Promise.all(
        parsedScores.map(score => {
          if (score === undefined) {
            return undefined;
          }
          return ScoreCoreService.insertScoreData(score, leaderboard, {
            insertBeatLeaderScore: true,
            insertPlayerInfo: true,
            insertPreviousScore: false,
            playerInfoById,
          });
        })
      )
    ).filter(score => score !== undefined) as ScoreSaberScore[];

    const totalPages = Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage);

    return {
      scores,
      leaderboard: leaderboard,
      beatSaver: await beatSaverPromise,
      metadata: {
        totalPages,
        totalItems: leaderboardScores.metadata.total,
        page: leaderboardScores.metadata.page,
        itemsPerPage: leaderboardScores.metadata.itemsPerPage,
      },
    };
  }
}
