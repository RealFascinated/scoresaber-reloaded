import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { timeAgo } from "@ssr/common/utils/time-utils";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { PlayerInfo } from "@/components/player/player-info";

type Props = {
  /**
   * The score to display.
   */
  score: ScoreSaberScore;

  /**
   * The claimed player.
   */
  claimedPlayer?: ScoreSaberPlayerToken;
};

export default function LeaderboardScore({ score, claimedPlayer }: Props) {
  const scorePlayer = score.playerInfo;

  return (
    <>
      {/* Score Rank */}
      <td className="px-4 py-2 whitespace-nowrap">#{score.rank}</td>

      {/* Player */}
      <td className="px-4 py-2 flex gap-2 whitespace-nowrap">
        <PlayerInfo player={scorePlayer} claimedPlayer={claimedPlayer} />
      </td>

      {/* Time Set */}
      <td className="px-4 py-2 text-center whitespace-nowrap">{timeAgo(score.timestamp)}</td>

      {/* Score */}
      <td className="px-4 py-2 text-center whitespace-nowrap">{formatNumberWithCommas(score.score)}</td>

      {/* Score Accuracy */}
      <td className="px-4 py-2 text-center whitespace-nowrap">{score.accuracy.toFixed(2)}%</td>

      {/* Score Misses */}
      <td className="px-4 py-2 text-center whitespace-nowrap">{score.misses > 0 ? `${score.misses}x` : "FC"}</td>

      {/* Score PP */}
      <td className="px-4 py-2 text-center text-pp whitespace-nowrap">{formatPp(score.pp)}pp</td>
    </>
  );
}
