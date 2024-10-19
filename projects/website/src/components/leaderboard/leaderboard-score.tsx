import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { PlayerInfo } from "@/components/player/player-info";
import { clsx } from "clsx";
import { Modifier } from "@ssr/common/score/modifier";
import Tooltip from "@/components/tooltip";
import { ScoreTimeSet } from "@/components/score/score-time-set";

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
          "px-4 py-2 text-center whitespace-nowrap",
          score.misses > 0 ? "text-red-500" : "text-green-500"
        )}
      >
        {score.misses > 0 ? `${score.misses}x` : "FC"}
      </td>

      {/* Score PP */}
      <td className="px-4 py-2 text-center text-pp whitespace-nowrap">{formatPp(score.pp)}pp</td>

      {/* Score Modifiers */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        <Tooltip
          display={
            <div>
              <p className="font-semibold">Modifiers</p>
              <p>{score.modifiers.join(", ")}</p>
            </div>
          }
        >
          <p className="cursor-pointer">
            {Object.entries(Modifier)
              .filter(mod => score.modifiers.includes(mod[1] as Modifier))
              .map(mod => mod[0])
              .splice(0, Object.entries(Modifier).length - 1)
              .join("")}
          </p>
        </Tooltip>
      </td>
    </>
  );
}
