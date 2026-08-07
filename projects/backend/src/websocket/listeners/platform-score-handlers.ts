import Logger from "@ssr/common/logger";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/v1/leaderboard";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/v1/leaderboard-player-info";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/v1/score";
import { beatLeaderTimesetToMs } from "@ssr/common/utils/beatleader-utils";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { connectBeatLeaderWebsocket } from "@ssr/common/websocket/beatleader-websocket";
import { connectScoresaberWebsocket } from "@ssr/common/websocket/scoresaber-websocket";
import { EventListener } from "../../event/event-listener";
import { EventsManager } from "../../event/events-manager";
import BeatLeaderSeenScoresMetric from "../../metrics/impl/player/beatleader-seen-scores";
import BeatLeaderUniqueDailyPlayersMetric from "../../metrics/impl/player/beatleader-unique-daily-players";
import UniqueDailyPlayersMetric from "../../metrics/impl/player/unique-daily-players";
import { BeatLeaderPlayersRepository } from "../../repositories/beatleader-players.repository";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import BeatLeaderService from "../../service/beatleader/beatleader.service";
import MetricsService, { MetricType } from "../../service/infra/metrics.service";
import { ScoreSaberLeaderboardsService } from "../../service/leaderboard/scoresaber-leaderboards.service";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { ScoreEventService } from "../../service/score-event/score-event.service";
import { TopScoresService } from "../../service/score/top-scores.service";

const scoreSaberWsLog = Logger.withTopic("ScoreSaber WebSocket");
const beatLeaderWsLog = Logger.withTopic("BeatLeader WebSocket");
const scoresWsLog = Logger.withTopic("Scores WebSocket");

interface PendingScore {
  scoreSaberToken?: ScoreSaberScoreToken;
  leaderboardToken?: ScoreSaberLeaderboardToken;
  player?: ScoreSaberLeaderboardPlayerInfoToken;
  beatLeaderScore?: BeatLeaderScoreToken;
  /** Uppercase `hash-difficulty-characteristic` used to pair scores across platforms. */
  mapKey: string;
  timestamp: number;
}

export class ScoreWebsockets implements EventListener {
  private static readonly SCORE_MATCH_TIMEOUT = TimeUnit.toMillis(TimeUnit.Second, 10);
  /** How close two play timestamps must be to be considered the same play. */
  private static readonly PLAY_TIME_WINDOW_MS = TimeUnit.toMillis(TimeUnit.Second, 5);
  private static readonly PENDING_SCORES = new Map<string, PendingScore>();

  /**
   * Converts a ScoreSaber score `timeSet` (an ISO-8601 string, e.g.
   * "2021-08-11T17:44:41.000Z") to unix milliseconds. ScoreSaber timestamps are
   * ISO-8601; BeatLeader's `timeset` is unix seconds and goes through
   * {@link beatLeaderTimesetToMs} instead. Returns NaN for unparseable input so
   * window comparisons fail safely.
   */
  private static scoresaberTimesetToMs(timeSet: string): number {
    const ms = new Date(timeSet).getTime();
    return Number.isFinite(ms) ? ms : NaN;
  }

  /**
   * Finds a pending BeatLeader score for the same play: same map, play time within the
   * pairing window, and set by the same human as the given ScoreSaber account.
   */
  private static async findPendingBlScore(
    mapKey: string,
    ssPlayerId: string,
    timesetMs: number
  ): Promise<{ key: string; beatLeaderScore: BeatLeaderScoreToken } | undefined> {
    const matches: { key: string; beatLeaderScore: BeatLeaderScoreToken; delta: number }[] = [];
    for (const [key, entry] of ScoreWebsockets.PENDING_SCORES.entries()) {
      if (!entry.beatLeaderScore || entry.mapKey !== mapKey) {
        continue;
      }
      const delta = Math.abs(beatLeaderTimesetToMs(entry.beatLeaderScore.timeset) - timesetMs);
      if (delta <= ScoreWebsockets.PLAY_TIME_WINDOW_MS) {
        matches.push({ key, beatLeaderScore: entry.beatLeaderScore, delta });
      }
    }
    matches.sort((a, b) => a.delta - b.delta);
    for (const match of matches) {
      if (await BeatLeaderService.isSamePlayer(match.beatLeaderScore.playerId, ssPlayerId)) {
        return match;
      }
    }
    return undefined;
  }

  /**
   * Finds a pending ScoreSaber score for the same play (mirror of {@link findPendingBlScore}).
   */
  private static async findPendingSsScore(
    mapKey: string,
    blPlayerId: string,
    timesetMs: number
  ): Promise<{ key: string; entry: PendingScore } | undefined> {
    const matches: { key: string; entry: PendingScore; delta: number }[] = [];
    for (const [key, entry] of ScoreWebsockets.PENDING_SCORES.entries()) {
      if (!entry.scoreSaberToken || !entry.player || entry.mapKey !== mapKey) {
        continue;
      }
      const delta = Math.abs(
        ScoreWebsockets.scoresaberTimesetToMs(entry.scoreSaberToken.timeSet) - timesetMs
      );
      if (delta <= ScoreWebsockets.PLAY_TIME_WINDOW_MS) {
        matches.push({ key, entry, delta });
      }
    }
    matches.sort((a, b) => a.delta - b.delta);
    for (const match of matches) {
      if (match.entry.player && (await BeatLeaderService.isSamePlayer(blPlayerId, match.entry.player.id))) {
        return match;
      }
    }
    return undefined;
  }

  constructor() {
    // Start the match timeout interval timer
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, pendingScore] of ScoreWebsockets.PENDING_SCORES.entries()) {
          if (now - pendingScore.timestamp >= ScoreWebsockets.SCORE_MATCH_TIMEOUT) {
            ScoreWebsockets.clearPendingScore(key);
            if (pendingScore.scoreSaberToken && pendingScore.leaderboardToken && pendingScore.player) {
              this.processScore(
                pendingScore.scoreSaberToken,
                pendingScore.leaderboardToken,
                pendingScore.player
              );
            } else if (pendingScore.beatLeaderScore) {
              this.processScore(undefined, undefined, undefined, pendingScore.beatLeaderScore);
            }
            continue;
          }
        }
      },
      TimeUnit.toMillis(TimeUnit.Minute, 1)
    );

    // Connect to websockets
    connectScoresaberWebsocket({
      onScore: async score => {
        try {
          const player = score.score.leaderboardPlayerInfo;
          const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);
          const mapKey =
            `${leaderboard.songHash}-${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`.toUpperCase();
          const key = `${player.id}-${mapKey}`;
          const timesetMs = ScoreWebsockets.scoresaberTimesetToMs(score.score.timeSet);

          //scoreSaberWsLog.info(`Received score for player ${player.id} with key ${key}`);

          const pendingScore = ScoreWebsockets.PENDING_SCORES.get(key);
          if (
            pendingScore?.beatLeaderScore &&
            Math.abs(beatLeaderTimesetToMs(pendingScore.beatLeaderScore.timeset) - timesetMs) <=
              ScoreWebsockets.PLAY_TIME_WINDOW_MS
          ) {
            // Found a matching BeatLeader score from the same player, process both
            ScoreWebsockets.clearPendingScore(key);
            await this.processScore(score.score, score.leaderboard, player, pendingScore.beatLeaderScore);
            return;
          }

          // No pending BeatLeader score under this player's key. The BeatLeader player ID
          // can differ from the ScoreSaber account ID, so also look for the same play by
          // map and time, set by the same human.
          const blMatch = await ScoreWebsockets.findPendingBlScore(mapKey, player.id, timesetMs);
          if (blMatch) {
            ScoreWebsockets.clearPendingScore(blMatch.key);
            await this.processScore(score.score, score.leaderboard, player, blMatch.beatLeaderScore);
            return;
          }

          // No matching BeatLeader score yet. If this key already holds a pending
          // score (other platform, or an earlier play), flush it first so it is
          // never silently discarded by the overwrite below.
          if (pendingScore) {
            await this.processScore(
              pendingScore.scoreSaberToken,
              pendingScore.leaderboardToken,
              pendingScore.player,
              pendingScore.beatLeaderScore
            );
            // Only clear if the entry is still the one we flushed (a concurrent
            // event may have replaced it while we were processing).
            if (ScoreWebsockets.PENDING_SCORES.get(key) === pendingScore) {
              ScoreWebsockets.clearPendingScore(key);
            }
          }

          // No matching BeatLeader score yet, store this one
          ScoreWebsockets.PENDING_SCORES.set(key, {
            scoreSaberToken: score.score,
            leaderboardToken: score.leaderboard,
            player,
            mapKey,
            timestamp: Date.now(),
          });
        } catch (error) {
          scoreSaberWsLog.error("Error processing ScoreSaber score:", error);
        }
      },
      onDisconnect: event => {
        scoreSaberWsLog.warn("ScoreSaber websocket disconnected:", event);
      },
    });

    connectBeatLeaderWebsocket({
      onScore: async beatLeaderScore => {
        // a reallyyyyyyyyyyyyyyy jank fix because ell 🥹🥹😢
        if (beatLeaderScore.playerId == "335393") {
          beatLeaderScore.playerId = "76561198979484227";
        }

        try {
          const beatLeaderSeenScoresMetric = MetricsService.getMetric<BeatLeaderSeenScoresMetric>(
            MetricType.BEATLEADER_SEEN_SCORES
          );
          beatLeaderSeenScoresMetric?.increment();

          const beatLeaderUniquePlayersMetric = MetricsService.getMetric<BeatLeaderUniqueDailyPlayersMetric>(
            MetricType.BEATLEADER_UNIQUE_DAILY_PLAYERS
          );
          beatLeaderUniquePlayersMetric?.addPlayer(beatLeaderScore.player!.id);

          const player = beatLeaderScore.player!;
          const leaderboard = beatLeaderScore.leaderboard;
          const mapKey =
            `${leaderboard.song.hash}-${leaderboard.difficulty.difficultyName}-${leaderboard.difficulty.modeName}`.toUpperCase();
          const key = `${beatLeaderScore.playerId}-${mapKey}`;
          const timesetMs = beatLeaderTimesetToMs(beatLeaderScore.timeset);

          //beatLeaderWsLog.info(`Received score for player ${player.id}(${player.platform}) with key ${key}`);

          const pendingScore = ScoreWebsockets.PENDING_SCORES.get(key);
          if (
            pendingScore?.scoreSaberToken &&
            pendingScore.leaderboardToken &&
            pendingScore.player &&
            Math.abs(
              ScoreWebsockets.scoresaberTimesetToMs(pendingScore.scoreSaberToken.timeSet) - timesetMs
            ) <= ScoreWebsockets.PLAY_TIME_WINDOW_MS
          ) {
            // Found a matching ScoreSaber score from the same player, process both
            ScoreWebsockets.clearPendingScore(key);
            await this.processScore(
              pendingScore.scoreSaberToken,
              pendingScore.leaderboardToken,
              pendingScore.player,
              beatLeaderScore
            );
            return;
          }

          // No pending ScoreSaber score under this player's key. The ScoreSaber account ID
          // can differ from the BeatLeader player ID, so also look for the same play by map
          // and time, set by the same human.
          const ssMatch = await ScoreWebsockets.findPendingSsScore(
            mapKey,
            beatLeaderScore.playerId,
            timesetMs
          );
          if (ssMatch) {
            ScoreWebsockets.clearPendingScore(ssMatch.key);
            await this.processScore(
              ssMatch.entry.scoreSaberToken,
              ssMatch.entry.leaderboardToken,
              ssMatch.entry.player,
              beatLeaderScore
            );
            return;
          }

          // No matching ScoreSaber score yet. If this key already holds a pending
          // score (other platform, or an earlier play), flush it first so it is
          // never silently discarded by the overwrite below.
          if (pendingScore) {
            await this.processScore(
              pendingScore.scoreSaberToken,
              pendingScore.leaderboardToken,
              pendingScore.player,
              pendingScore.beatLeaderScore
            );
            // Only clear if the entry is still the one we flushed (a concurrent
            // event may have replaced it while we were processing).
            if (ScoreWebsockets.PENDING_SCORES.get(key) === pendingScore) {
              ScoreWebsockets.clearPendingScore(key);
            }
          }

          // No matching ScoreSaber score yet, store this one
          ScoreWebsockets.PENDING_SCORES.set(key, {
            beatLeaderScore,
            mapKey,
            timestamp: Date.now(),
          });
        } catch (error) {
          beatLeaderWsLog.error("Error processing BeatLeader score:", error);
        }
      },
    });
  }

  /**
   * Clear a pending score.
   *
   * @param key the key of the pending score to clear.
   */
  private static clearPendingScore(key: string) {
    this.PENDING_SCORES.delete(key);
  }

  /**
   * Process a score.
   *
   * @param scoreSaberToken the ScoreSaber score to process.
   * @param leaderboardToken the leaderboard for the score.
   * @param player the player for the score.
   * @param beatLeaderScore the BeatLeader score to process.
   */
  private async processScore(
    scoreSaberToken?: ScoreSaberScoreToken,
    leaderboardToken?: ScoreSaberLeaderboardToken,
    player?: ScoreSaberLeaderboardPlayerInfoToken,
    beatLeaderScore?: BeatLeaderScoreToken
  ) {
    if (scoreSaberToken && leaderboardToken && player) {
      const scoreLeaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
      const score = getScoreSaberScoreFromToken(scoreSaberToken, scoreLeaderboard, player.id);
      const isTop50GlobalScore = await TopScoresService.isTop50GlobalScore(score);

      // Create the player, update their name if they are already being tracked
      if (!(await PlayerCoreService.createPlayer(player.id)) && player.name) {
        void PlayerCoreService.updatePlayer(player.id, { name: player.name }).catch(error => {
          scoresWsLog.warn(`Failed to update name for player "${player.id}":`, error);
        });
      }

      // Fetch the leaderboard if it doesn't exist
      if (!(await ScoreSaberLeaderboardsRepository.existsById(scoreLeaderboard.id))) {
        // The websocket event already carries the full leaderboard, so create it from that instead
        // of round-tripping to the ScoreSaber API (which can transiently fail for brand-new
        // leaderboards and would drop the score event entirely).
        await ScoreSaberLeaderboardsService.createLeaderboard(scoreLeaderboard.id, undefined, {
          leaderboard: { ...scoreLeaderboard, plays: scoreLeaderboard.plays + 1 }, // returned value from the websocket is 1 less than the actual plays
        });
      } else {
        await ScoreSaberLeaderboardsRepository.updateLeaderboard(scoreLeaderboard.id, {
          plays: scoreLeaderboard.plays + 1, // returned value from the websocket is 1 less than the actual plays
          maxScore: scoreLeaderboard.maxScore,
        });
      }

      // Track unique daily players in Redis
      const metric = MetricsService.getMetric<UniqueDailyPlayersMetric>(MetricType.UNIQUE_DAILY_PLAYERS);
      metric?.addPlayer(player.id);

      // Insert a score event
      await ScoreEventService.insertScoreEvent(score);

      // Save the score stats
      if (beatLeaderScore) {
        // no need to await this
        BeatLeaderService.saveScoreStats(beatLeaderScore.id);
      }

      // Wait for all event listeners to process the score
      await Promise.all(
        EventsManager.getListeners().map(async listener => {
          try {
            await listener.onScoreReceived?.(
              score,
              scoreLeaderboard,
              score.playerInfo!,
              beatLeaderScore,
              isTop50GlobalScore
            );
          } catch (error) {
            scoresWsLog.error(`Error in listener ${listener.constructor.name}:`, error);
          }
        })
      );
    } else if (beatLeaderScore) {
      // No ScoreSaber score arrived for this play (e.g. the ScoreSaber socket missed it).
      // Track the BeatLeader score for the player's account when they are known to us;
      // unknown players are left to the seed queue rather than resolving every global score.
      const known =
        (await PlayerCoreService.getAccount(beatLeaderScore.playerId)) != null ||
        (await BeatLeaderPlayersRepository.findById(beatLeaderScore.playerId)) != null;
      if (known) {
        await BeatLeaderService.trackBeatLeaderScore(beatLeaderScore, false);
      }
    }
  }

  onStop: () => Promise<void> = async () => {
    // Process all pending scores
    for (const [key, pendingScore] of ScoreWebsockets.PENDING_SCORES.entries()) {
      // Process the score
      this.processScore(
        pendingScore.scoreSaberToken,
        pendingScore.leaderboardToken,
        pendingScore.player,
        pendingScore.beatLeaderScore
      );

      ScoreWebsockets.PENDING_SCORES.delete(key);
    }
  };
}
