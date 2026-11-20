import Logger from "@ssr/common/logger";
import { ReplayDecoder } from "@ssr/common/replay/replay-decoder";
import type { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import type { ChatGetScoreSummaryToolInput } from "@ssr/common/schemas/chat/tools/score-tools";
import { ChatGetScoreSummaryToolInputSchema } from "@ssr/common/schemas/chat/tools/score-tools";
import { getBeatLeaderReplayCdnUrl } from "@ssr/common/utils/beatleader-utils";
import { tool } from "ai";
import { ScoreSaberScoreHistoryRepository } from "../../../repositories/scoresaber-score-history.repository";
import { ScoreSaberScoresRepository } from "../../../repositories/scoresaber-scores.repository";
import BeatLeaderService from "../../beatleader/beatleader.service";
import { PlayerScoresService } from "../../player/player-scores.service";
import type { ChatToolContext } from "../chat-tool-context";
import { resolvePlayerId } from "./player-tool-results";
import { buildScoreSummary } from "./score-summary";
import { runTool, toolSchema } from "./tool-runtime";

const logger = Logger.withTopic("Chat Score Tools");

async function loadReplay(beatLeaderScore: BeatLeaderScore | undefined) {
  if (!beatLeaderScore) {
    return { replay: undefined, unavailableReason: "This score has no BeatLeader replay." };
  }
  try {
    const replay = await ReplayDecoder.decodeReplay(getBeatLeaderReplayCdnUrl(beatLeaderScore));
    return { replay, unavailableReason: null };
  } catch (error) {
    logger.warn(`Failed to decode replay for BeatLeader score ${beatLeaderScore.scoreId}: ${error}`);
    return { replay: undefined, unavailableReason: "The BeatLeader replay could not be loaded." };
  }
}

async function loadScoreStats(beatLeaderScore: BeatLeaderScore | undefined) {
  if (!beatLeaderScore) {
    return undefined;
  }
  try {
    return await BeatLeaderService.getScoresFullScoreStats(beatLeaderScore.scoreId);
  } catch (error) {
    logger.warn(`Failed to load score stats for BeatLeader score ${beatLeaderScore.scoreId}: ${error}`);
    return undefined;
  }
}

async function resolveScoreId(context: ChatToolContext, input: ChatGetScoreSummaryToolInput) {
  if (input.scoreId !== undefined) {
    return { ok: true as const, scoreId: input.scoreId };
  }
  if (input.leaderboardId === undefined) {
    return {
      ok: false as const,
      error:
        "Pass a scoreId from another tool result, or a leaderboardId from resolveMap to use the player's current score on that map.",
    };
  }
  const resolved = resolvePlayerId(context, input.playerId);
  if (!resolved.ok) {
    return resolved;
  }
  const row = await ScoreSaberScoresRepository.findByPlayerAndLeaderboard(
    resolved.playerId,
    input.leaderboardId,
    context.realmId
  );
  if (!row) {
    return {
      ok: false as const,
      error: `Player "${resolved.playerId}" has no score on leaderboard ${input.leaderboardId}.`,
    };
  }
  return { ok: true as const, scoreId: row.scoreId };
}

/**
 * Builds the score tools for a chat turn, which read a single score and its BeatLeader replay.
 */
export function createScoreTools(context: ChatToolContext) {
  return {
    getScoreSummary: tool({
      description:
        "Summarize one score in full, everything on its score page and more. map: stars, max pp, plays, length, notes, bombs, walls, NPS, NJS, offset. result: accuracy, pp, weighted pp, leaderboard rank and topPercentOfPlays, misses, bad cuts, max combo, modifiers, headset, scoresSetOnMap. previousScore: the previous score on the map and the change from it. beatLeader: FC accuracy and FC pp, per hand average cut, pauses, bomb and wall hits. beatLeaderStats and previousBeatLeaderStats: BeatLeader's tracker for this run and the previous one (per hand pre-swing, center and follow-through averages, timing, misses, pause time, height, head position). accuracyBySecond: running accuracy, previous run accuracy and pp at each second (array index is the second). replay, when a BeatLeader replay exists: points and accuracy lost to pre-swing, follow-through, center and misses; per hand stats with part averages, swing speed, time deviation and cut angle error; every cut direction and grid position with part averages; cut score and center score counts; swing speed every 2 seconds; a section by section timeline; busy versus quiet parts; streaks; every miss, bad cut (with its reason), bomb and wall hit with its time and the combo it broke; every rough moment; pauses; and every plain-language takeaway. replay is null when no replay could be read and replayUnavailableReason says why; then say the detailed analysis is unavailable. Pass a scoreId from another tool, or a leaderboardId from resolveMap for the player's current score on that map. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatGetScoreSummaryToolInputSchema),
      execute: (input: ChatGetScoreSummaryToolInput) =>
        runTool(async () => {
          const resolved = await resolveScoreId(context, input);
          if (!resolved.ok) {
            return { error: resolved.error };
          }
          const playerScore = await PlayerScoresService.getScore(resolved.scoreId, context.realmId);
          const { beatLeaderScore, playerId, leaderboardId } = playerScore.score;
          const [{ replay, unavailableReason }, scoreStats, scoresSetOnMap] = await Promise.all([
            loadReplay(beatLeaderScore),
            loadScoreStats(beatLeaderScore),
            ScoreSaberScoreHistoryRepository.countCombinedScoresForPlayerMap(playerId, leaderboardId),
          ]);
          return {
            ...buildScoreSummary(playerScore, { replay, scoreStats, scoresSetOnMap }),
            replayUnavailableReason: unavailableReason,
          };
        }, "The score could not be loaded. Check that the scoreId came from a tool result."),
    }),
  };
}
