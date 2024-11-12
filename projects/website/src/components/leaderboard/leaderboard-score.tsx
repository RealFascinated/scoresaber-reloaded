import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { PlayerInfo } from "@/components/player/player-info";
import { clsx } from "clsx";
import Tooltip from "@/components/tooltip";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { ScoreModifiers } from "@/components/score/score-modifiers";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import ScoreMissesAndPausesBadge from "@/components/score/badges/score-misses-and-pauses";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";

type Props = {
  /**
   * The score to display.
   */
  score: ScoreSaberScore;

  /**
   * The leaderboard for the score.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The claimed player.
   */
  highlightedPlayer?: ScoreSaberPlayer;
};

export default function LeaderboardScore({ score, leaderboard, highlightedPlayer }: Props) {
  const scorePlayer = score.playerInfo;

  return (
    <>
      {/* Score Rank */}
      <td className="px-4 py-2 whitespace-nowrap">{score.rank !== -1 ? `#${score.rank}` : "-"}</td>

      {/* Player */}
      <td className="px-4 py-2 flex gap-2 whitespace-nowrap min-w-[250px]">
        <PlayerInfo player={scorePlayer} highlightedPlayer={highlightedPlayer} useLink />
      </td>

      {/* Time Set */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        <ScoreTimeSet score={score} />
      </td>

      {/* Score */}
      <td className="px-4 py-2 text-center whitespace-nowrap">{formatNumberWithCommas(score.score)}</td>

      {/* Score Accuracy */}
      <td className="px-4 py-2 text-center whitespace-nowrap">{formatScoreAccuracy(score)}</td>

      {/* Score Misses */}
      <td
        className={clsx(
          "px-4 py-2 whitespace-nowrap cursor-default",
          score.misses > 0 ? "text-red-500" : "text-green-500"
        )}
      >
        <ScoreMissesAndPausesBadge score={score} hideXMark />
      </td>

      {/* Score PP */}
      {leaderboard.stars > 0 && (
        <td className="px-4 py-2 text-center text-ssr whitespace-nowrap">{formatPp(score.pp)}pp</td>
      )}

      {/* Score Modifiers */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        <Tooltip
          display={
            <div>
              <p className="font-semibold">Modifiers</p>
              <ScoreModifiers type="full" score={score} />
            </div>
          }
        >
          <p className="cursor-default">
            <ScoreModifiers type="simple" score={score} />
          </p>
        </Tooltip>
      </td>
    </>
  );
}
