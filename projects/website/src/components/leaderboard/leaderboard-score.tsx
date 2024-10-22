import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { PlayerInfo } from "@/components/player/player-info";
import { clsx } from "clsx";
import Tooltip from "@/components/tooltip";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { ScoreModifiers } from "@/components/score/score-modifiers";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import ScoreMissesBadge from "@/components/score/badges/score-misses";

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
  claimedPlayer?: ScoreSaberPlayerToken;
};

export default function LeaderboardScore({ score, leaderboard, claimedPlayer }: Props) {
  const scorePlayer = score.playerInfo;

  return (
    <>
      {/* Score Rank */}
      <td className="px-4 py-2 whitespace-nowrap">#{score.rank}</td>

      {/* Player */}
      <td className="px-4 py-2 flex gap-2 whitespace-nowrap">
        <PlayerInfo player={scorePlayer} highlightedPlayer={claimedPlayer} />
      </td>

      {/* Time Set */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        <ScoreTimeSet score={score} />
      </td>

      {/* Score */}
      <td className="px-4 py-2 text-center whitespace-nowrap">{formatNumberWithCommas(score.score)}</td>

      {/* Score Accuracy */}
      <td className="px-4 py-2 text-center whitespace-nowrap">{score.accuracy.toFixed(2)}%</td>

      {/* Score Misses */}
      <td
        className={clsx(
          "px-4 py-2 whitespace-nowrap cursor-default",
          score.misses > 0 ? "text-red-500" : "text-green-500"
        )}
      >
        <ScoreMissesBadge score={score} hideXMark />
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
