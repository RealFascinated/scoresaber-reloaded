import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
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
  ) {
    const [leaderboard, leaderboardScores] = await Promise.all([
      ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId, realmId),
      ScoreSaberApiService.lookupLeaderboardScores(leaderboardId, page, { country: country }),
    ]);
    if (leaderboard == undefined) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }
    if (!leaderboardScores.ok) {
      if (leaderboardScores.error === "not_found") {
        throw new NotFoundError(`Leaderboard scores for leaderboard "${leaderboardId}" not found`);
      }
      throw new Error(
        `Failed to fetch scores for leaderboard "${leaderboardId}": ${leaderboardScores.message}`
      );
    }
    const scoresPage = leaderboardScores.response;

    const defaultRealmScores = scoresPage.scores.map(token =>
      getScoreSaberScoreFromToken(token, leaderboard, token.leaderboardPlayerInfo.id)
    );

    void ScoreCoreService.upsertScoresFromApi(defaultRealmScores);

    let parsedScores = defaultRealmScores;
    if (realmId !== DEFAULT_REALM_ID) {
      const curve = leaderboard.ranked ? await RealmService.getCalculationCurve(realmId) : undefined;
      parsedScores = defaultRealmScores.map(score => ({
        ...score,
        pp: curve ? ScoreSaberCurve.getPp(leaderboard.stars, score.accuracy, curve) : 0,
      }));
    }

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

    const totalPages = Math.ceil(scoresPage.metadata.total / scoresPage.metadata.itemsPerPage);

    return {
      scores,
      leaderboard: leaderboard,
      beatSaver: await beatSaverPromise,
      metadata: {
        totalPages,
        totalItems: scoresPage.metadata.total,
        page: scoresPage.metadata.page,
        itemsPerPage: scoresPage.metadata.itemsPerPage,
      },
    };
  }
}
