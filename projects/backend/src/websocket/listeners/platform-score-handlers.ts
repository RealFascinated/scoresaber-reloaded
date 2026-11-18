import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { ScoreSaberLeaderboardToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard-player-info";
import { ScoreSaberScoreToken } from "@ssr/common/schemas/scoresaber/tokens/v1/score";
import { getScoreSaberLeaderboardFromToken, getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
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
  mapKey: string;
  timestamp: number;
}

export class ScoreWebsockets implements EventListener {
  private static readonly SCORE_MATCH_TIMEOUT = TimeUnit.toMillis(TimeUnit.Second, 10);
  private static readonly PLAY_TIME_WINDOW_MS = TimeUnit.toMillis(TimeUnit.Second, 5);
  private static readonly PENDING_SCORES = new Map<string, PendingScore>();

  private static scoresaberTimesetToMs(timeSet: string) {
    const ms = new Date(timeSet).getTime();
    return Number.isFinite(ms) ? ms : NaN;
  }

  private static readonly BL_MAPPING_LOOKUP_COOLDOWN_MS = TimeUnit.toMillis(TimeUnit.Minute, 30);
  private static readonly BL_MAPPING_LOOKUP_MAX_ENTRIES = 10_000;
  private static readonly blMappingLookupTimes = new Map<string, number>();

  private static canLookupBlMapping(playerId: string) {
    const last = ScoreWebsockets.blMappingLookupTimes.get(playerId);
    return last == null || Date.now() - last >= ScoreWebsockets.BL_MAPPING_LOOKUP_COOLDOWN_MS;
  }

  private static recordBlMappingLookup(playerId: string) {
    ScoreWebsockets.blMappingLookupTimes.set(playerId, Date.now());
    if (ScoreWebsockets.blMappingLookupTimes.size > ScoreWebsockets.BL_MAPPING_LOOKUP_MAX_ENTRIES) {
      const oldest = [...ScoreWebsockets.blMappingLookupTimes.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, Math.floor(ScoreWebsockets.BL_MAPPING_LOOKUP_MAX_ENTRIES / 4));
      for (const [key] of oldest) {
        ScoreWebsockets.blMappingLookupTimes.delete(key);
      }
    }
  }

  private static async fetchBlMappingIfTracked(blPlayerId: string) {
    if (!ScoreWebsockets.canLookupBlMapping(blPlayerId)) {
      return undefined;
    }
    ScoreWebsockets.recordBlMappingLookup(blPlayerId);
    return BeatLeaderService.fetchMappingIfTracked(blPlayerId);
  }

  private static async findPendingBlScore(mapKey: string, ssPlayerId: string, timesetMs: number) {
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

  private static async findPendingSsScore(mapKey: string, blPlayerId: string, timesetMs: number) {
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
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, pendingScore] of ScoreWebsockets.PENDING_SCORES.entries()) {
          if (now - pendingScore.timestamp >= ScoreWebsockets.SCORE_MATCH_TIMEOUT) {
            ScoreWebsockets.clearPendingScore(key);
            if (pendingScore.scoreSaberToken && pendingScore.leaderboardToken && pendingScore.player) {
              void this.processScoreSafely(
                pendingScore.scoreSaberToken,
                pendingScore.leaderboardToken,
                pendingScore.player
              );
            } else if (pendingScore.beatLeaderScore) {
              void this.processScoreSafely(undefined, undefined, undefined, pendingScore.beatLeaderScore);
            }
            continue;
          }
        }
      },
      TimeUnit.toMillis(TimeUnit.Second, 15)
    );

    connectScoresaberWebsocket({
      onScore: async score => {
        try {
          const player = score.score.leaderboardPlayerInfo;
          const leaderboard = getScoreSaberLeaderboardFromToken(score.leaderboard);
          const mapKey =
            `${leaderboard.songHash}-${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`.toUpperCase();
          const key = `${player.id}-${mapKey}`;
          const timesetMs = ScoreWebsockets.scoresaberTimesetToMs(score.score.timeSet);

          const pendingScore = ScoreWebsockets.PENDING_SCORES.get(key);
          if (
            pendingScore?.beatLeaderScore &&
            Math.abs(beatLeaderTimesetToMs(pendingScore.beatLeaderScore.timeset) - timesetMs) <=
              ScoreWebsockets.PLAY_TIME_WINDOW_MS
          ) {
            ScoreWebsockets.clearPendingScore(key);
            await this.processScore(score.score, score.leaderboard, player, pendingScore.beatLeaderScore);
            return;
          }

          const blMatch = await ScoreWebsockets.findPendingBlScore(mapKey, player.id, timesetMs);
          if (blMatch) {
            ScoreWebsockets.clearPendingScore(blMatch.key);
            await this.processScore(score.score, score.leaderboard, player, blMatch.beatLeaderScore);
            return;
          }

          if (pendingScore) {
            await this.processScore(
              pendingScore.scoreSaberToken,
              pendingScore.leaderboardToken,
              pendingScore.player,
              pendingScore.beatLeaderScore
            );
            if (ScoreWebsockets.PENDING_SCORES.get(key) === pendingScore) {
              ScoreWebsockets.clearPendingScore(key);
            }
          }

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
        try {
          const beatLeaderSeenScoresMetric = MetricsService.getMetric<BeatLeaderSeenScoresMetric>(
            MetricType.BEATLEADER_SEEN_SCORES
          );
          beatLeaderSeenScoresMetric?.increment();

          const beatLeaderUniquePlayersMetric = MetricsService.getMetric<BeatLeaderUniqueDailyPlayersMetric>(
            MetricType.BEATLEADER_UNIQUE_DAILY_PLAYERS
          );
          beatLeaderUniquePlayersMetric?.addPlayer(beatLeaderScore.player!.id);

          const leaderboard = beatLeaderScore.leaderboard;
          const mapKey =
            `${leaderboard.song.hash}-${leaderboard.difficulty.difficultyName}-${leaderboard.difficulty.modeName}`.toUpperCase();
          const key = `${beatLeaderScore.playerId}-${mapKey}`;
          const timesetMs = beatLeaderTimesetToMs(beatLeaderScore.timeset);

          const pendingScore = ScoreWebsockets.PENDING_SCORES.get(key);
          if (
            pendingScore?.scoreSaberToken &&
            pendingScore.leaderboardToken &&
            pendingScore.player &&
            Math.abs(
              ScoreWebsockets.scoresaberTimesetToMs(pendingScore.scoreSaberToken.timeSet) - timesetMs
            ) <= ScoreWebsockets.PLAY_TIME_WINDOW_MS
          ) {
            ScoreWebsockets.clearPendingScore(key);
            await this.processScore(
              pendingScore.scoreSaberToken,
              pendingScore.leaderboardToken,
              pendingScore.player,
              beatLeaderScore
            );
            return;
          }

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

          if (pendingScore) {
            await this.processScore(
              pendingScore.scoreSaberToken,
              pendingScore.leaderboardToken,
              pendingScore.player,
              pendingScore.beatLeaderScore
            );
            if (ScoreWebsockets.PENDING_SCORES.get(key) === pendingScore) {
              ScoreWebsockets.clearPendingScore(key);
            }
          }

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

  private static clearPendingScore(key: string) {
    this.PENDING_SCORES.delete(key);
  }

  private async processScore(
    scoreSaberToken?: ScoreSaberScoreToken,
    leaderboardToken?: ScoreSaberLeaderboardToken,
    player?: ScoreSaberLeaderboardPlayerInfoToken,
    beatLeaderScore?: BeatLeaderScoreToken
  ) {
    if (env.IGNORE_WEBSOCKET_SCORES) {
      scoresWsLog.debug("Ignoring websocket score: IGNORE_WEBSOCKET_SCORES is enabled");
      return;
    }
    if (scoreSaberToken && leaderboardToken && player) {
      const scoreLeaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
      const score = getScoreSaberScoreFromToken(scoreSaberToken, scoreLeaderboard, player.id);
      const isTop50GlobalScore = await TopScoresService.isTop50GlobalScore(score);

      const account = await PlayerCoreService.createPlayer(player.id);
      if (!account) {
        scoresWsLog.warn(
          `Skipping score for "${player.id}" on "${scoreLeaderboard.songName}": account could not be created`
        );
        return;
      }

      if (player.name) {
        void PlayerCoreService.updatePlayer(player.id, { name: player.name }).catch(error => {
          scoresWsLog.warn(`Failed to update name for player "${player.id}":`, error);
        });
      }

      const leaderboardExists = await ScoreSaberLeaderboardsRepository.updatePlaysAndMaxScore(
        scoreLeaderboard.id,
        scoreLeaderboard.plays + 1,
        scoreLeaderboard.maxScore
      );
      if (!leaderboardExists) {
        await ScoreSaberLeaderboardsService.createLeaderboard(scoreLeaderboard.id, undefined, {
          leaderboard: { ...scoreLeaderboard, plays: scoreLeaderboard.plays + 1 },
        });
      }

      const metric = MetricsService.getMetric<UniqueDailyPlayersMetric>(MetricType.UNIQUE_DAILY_PLAYERS);
      metric?.addPlayer(player.id);

      await ScoreEventService.insertScoreEvent(score);

      if (beatLeaderScore) {
        void BeatLeaderService.saveScoreStats(beatLeaderScore.id).catch(error => {
          scoresWsLog.warn(`Failed to save score stats for "${beatLeaderScore.id}":`, error);
        });
      }

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
      const known =
        (await PlayerCoreService.getAccount(beatLeaderScore.playerId)) != null ||
        (await BeatLeaderPlayersRepository.findById(beatLeaderScore.playerId)) != null;
      if (!known) {
        const mapping = await ScoreWebsockets.fetchBlMappingIfTracked(beatLeaderScore.playerId);
        if (mapping) {
          await BeatLeaderService.trackBeatLeaderScore(beatLeaderScore, false);
          return;
        }
      }
      if (known) {
        await BeatLeaderService.trackBeatLeaderScore(beatLeaderScore, false);
      }
    }
  }

  private async processScoreSafely(
    scoreSaberToken?: ScoreSaberScoreToken,
    leaderboardToken?: ScoreSaberLeaderboardToken,
    player?: ScoreSaberLeaderboardPlayerInfoToken,
    beatLeaderScore?: BeatLeaderScoreToken
  ) {
    try {
      await this.processScore(scoreSaberToken, leaderboardToken, player, beatLeaderScore);
    } catch (error) {
      scoresWsLog.error("Error processing pending score:", error);
    }
  }

  onStop: () => Promise<void> = async () => {
    const pendingScores = [...ScoreWebsockets.PENDING_SCORES.values()];
    ScoreWebsockets.PENDING_SCORES.clear();

    await Promise.all(
      pendingScores.map(pendingScore =>
        this.processScoreSafely(
          pendingScore.scoreSaberToken,
          pendingScore.leaderboardToken,
          pendingScore.player,
          pendingScore.beatLeaderScore
        )
      )
    );
  };
}
