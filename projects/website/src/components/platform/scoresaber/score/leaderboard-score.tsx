import { getRankColor } from "@/common/color-utils";
import ScoreMissesAndPausesBadge from "@/components/platform/scoresaber/score/badges/score-misses-and-pauses";
import { ScorePpBadge } from "@/components/platform/scoresaber/score/badges/score-pp";
import { ScoreSaberScoreModifiers } from "@/components/platform/scoresaber/score/score-modifiers";
import { PlayerInfo } from "@/components/player/player-info";
import PlayerPreview from "@/components/player/player-preview";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { clsx } from "clsx";
import { ScoreSaberScoreHMD } from "./score-hmd";

export default function ScoreSaberLeaderboardScore({
  score,
  leaderboard,
  highlightedPlayerId,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  highlightedPlayerId?: string;
}) {
  const scorePlayer = score.playerInfo;

  return (
    <>
      {/* Score Rank */}
      <td className="px-4 py-2 whitespace-nowrap">
        <p className={`${getRankColor(score.rank)}`}>
          {score.rank !== -1 ? `#${score.rank}` : "-"}
        </p>
      </td>

      {/* Player */}
      <td className="flex min-w-[250px] gap-2 px-4 py-2 whitespace-nowrap">
        <PlayerPreview playerId={scorePlayer.id}>
          <PlayerInfo player={scorePlayer} highlightedPlayerId={highlightedPlayerId} useLink />
        </PlayerPreview>
      </td>

      {/* Time Set */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        <ScoreTimeSet timestamp={score.timestamp} />
      </td>

      {/* Score Accuracy */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        {formatScoreAccuracy(score.accuracy)}
      </td>

      {/* Score Misses */}
      <td
        className={clsx(
          "cursor-default px-4 py-2 whitespace-nowrap",
          score.misses > 0 ? "text-red-500" : "text-green-500"
        )}
      >
        <ScoreMissesAndPausesBadge score={score} hideXMark hidePreviousScore />
      </td>

      {/* PP / Score */}
      {leaderboard.stars > 0 ? (
        <td className="text-ssr px-4 py-2 whitespace-nowrap">
          <ScorePpBadge score={score} leaderboard={leaderboard} />
        </td>
      ) : (
        <td className="px-4 py-2 text-center whitespace-nowrap">
          <p>{formatNumberWithCommas(score.score)}</p>
        </td>
      )}

      {/* HMD */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        <ScoreSaberScoreHMD score={score}>
          <p>{score.hmd ?? "Unknown"}</p>
        </ScoreSaberScoreHMD>
      </td>

      {/* Score Modifiers */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        <SimpleTooltip
          side="bottom"
          display={
            <div>
              <p className="font-semibold">Modifiers</p>
              <ScoreSaberScoreModifiers type="full" score={score} />
            </div>
          }
        >
          <p className="cursor-default">
            <ScoreSaberScoreModifiers type="simple" score={score} />
          </p>
        </SimpleTooltip>
      </td>

      {/* Score Replay */}
      <td className="w-[32px]">
        {score.additionalData && (
          <div className="flex justify-center">
            <ScoreReplayButton additionalData={score.additionalData} />
          </div>
        )}
      </td>
    </>
  );
}
